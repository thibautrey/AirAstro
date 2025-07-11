#!/bin/bash

# Script pour résoudre les conflits de packages INDI
# Utilisation: ./fix-package-conflicts.sh [brand_name]

set -e

log() { echo -e "\033[1;32m[Package Fix]\033[0m $*"; }
error() { echo -e "\033[1;31m[Error]\033[0m $*" >&2; }
warn() { echo -e "\033[1;33m[Warning]\033[0m $*"; }

# Vérifier les permissions
if [ "$(id -u)" -ne 0 ] && ! command -v sudo >/dev/null; then
  error "Ce script nécessite des privilèges root ou sudo"
  exit 1
fi

run() { 
  if [ "$(id -u)" -eq 0 ]; then 
    bash -c "$*"; 
  else 
    sudo bash -c "$*"; 
  fi
}

# Fonction pour diagnostiquer les conflits
diagnose_conflicts() {
  log "Diagnostic des conflits de packages..."
  
  # Vérifier les packages cassés
  BROKEN_PACKAGES=$(dpkg -l | grep '^..r' | awk '{print $2}' | tr '\n' ' ')
  if [ -n "$BROKEN_PACKAGES" ]; then
    warn "Packages cassés détectés: $BROKEN_PACKAGES"
    return 1
  fi
  
  # Vérifier les conflits spécifiques Player One
  if dpkg -l | grep -q "indi-playerone" && dpkg -l | grep -q "libplayerone"; then
    warn "Conflit Player One détecté (indi-playerone vs libplayerone)"
    return 1
  fi
  
  # Vérifier les dépendances non satisfaites
  if ! apt-get check >/dev/null 2>&1; then
    warn "Dépendances non satisfaites détectées"
    return 1
  fi
  
  log "✅ Aucun conflit détecté"
  return 0
}

# Fonction pour résoudre les conflits Player One spécifiquement
fix_playerone_conflicts() {
  log "Résolution des conflits Player One..."
  
  # Arrêter les services INDI qui pourraient utiliser les drivers
  run "systemctl stop airastro.service 2>/dev/null || true"
  run "pkill -f indiserver 2>/dev/null || true"
  
  # Supprimer tous les packages Player One en conflit
  log "Suppression des packages Player One en conflit..."
  run "dpkg --remove --force-remove-reinstreq indi-playerone libplayerone libplayeronecamera2 2>/dev/null || true"
  run "apt-get purge -y indi-playerone libplayerone libplayeronecamera2 2>/dev/null || true"
  
  # Supprimer les fichiers de règles udev en conflit
  log "Suppression des fichiers de règles udev en conflit..."
  run "rm -f /lib/udev/rules.d/99-player_one_astronomy.rules"
  run "rm -f /etc/udev/rules.d/99-player_one_astronomy.rules"
  run "rm -f /usr/lib/udev/rules.d/99-player_one_astronomy.rules"
  
  # Nettoyer le cache et réparer
  log "Nettoyage et réparation..."
  run "apt-get clean"
  run "apt-get autoclean"
  run "apt-get autoremove -y"
  
  # Réparer les dépendances cassées
  run "dpkg --configure -a"
  run "apt-get --fix-broken install -y"
  
  # Redémarrer udev pour prendre en compte les changements
  run "udevadm control --reload-rules"
  run "udevadm trigger"
  
  log "✅ Conflits Player One résolus"
}

# Fonction pour résoudre les conflits généraux
fix_general_conflicts() {
  log "Résolution des conflits généraux..."
  
  # Configurer les packages en attente
  run "dpkg --configure -a"
  
  # Forcer la suppression des packages cassés
  BROKEN_PACKAGES=$(dpkg -l | grep '^..r' | awk '{print $2}' | tr '\n' ' ')
  if [ -n "$BROKEN_PACKAGES" ]; then
    log "Suppression des packages cassés: $BROKEN_PACKAGES"
    run "dpkg --remove --force-remove-reinstreq $BROKEN_PACKAGES"
  fi
  
  # Nettoyer et réparer
  run "apt-get clean"
  run "apt-get autoclean"
  run "apt-get --fix-broken install -y"
  run "apt-get autoremove -y"
  
  log "✅ Conflits généraux résolus"
}

# Fonction pour vérifier l'installation après réparation
verify_installation() {
  log "Vérification de l'installation..."
  
  # Vérifier que dpkg fonctionne correctement
  if ! dpkg --configure -a; then
    error "Échec de la configuration des packages"
    return 1
  fi
  
  # Vérifier que apt fonctionne correctement
  if ! apt-get check >/dev/null 2>&1; then
    error "Dépendances toujours cassées"
    return 1
  fi
  
  # Vérifier qu'INDI fonctionne toujours
  if command -v indiserver >/dev/null; then
    log "✅ indiserver toujours disponible"
  else
    warn "indiserver non disponible - réinstallation peut être nécessaire"
  fi
  
  log "✅ Installation vérifiée"
  return 0
}

# Fonction principale
main() {
  local brand_name="${1:-}"
  
  log "Début de la résolution des conflits de packages"
  
  if [ -n "$brand_name" ]; then
    log "Marque spécifiée: $brand_name"
  fi
  
  # Diagnostic initial
  if diagnose_conflicts; then
    log "Aucun conflit détecté, arrêt"
    return 0
  fi
  
  # Résoudre les conflits spécifiques selon la marque
  case "${brand_name,,}" in
    "player one"|"playerone")
      fix_playerone_conflicts
      ;;
    "")
      # Aucune marque spécifiée, résoudre les conflits généraux
      # Vérifier d'abord les conflits Player One
      if dpkg -l | grep -q -E "(indi-playerone|libplayerone)" && dpkg -l | grep -q "libplayeronecamera2"; then
        warn "Conflit Player One détecté, résolution automatique"
        fix_playerone_conflicts
      else
        fix_general_conflicts
      fi
      ;;
    *)
      log "Marque '$brand_name' non reconnue, résolution générale"
      fix_general_conflicts
      ;;
  esac
  
  # Vérification finale
  if verify_installation; then
    log "✅ Résolution des conflits terminée avec succès"
    
    # Redémarrer les services AirAstro
    if systemctl is-enabled airastro.service >/dev/null 2>&1; then
      log "Redémarrage du service AirAstro..."
      run "systemctl start airastro.service"
    fi
    
    return 0
  else
    error "Échec de la résolution des conflits"
    return 1
  fi
}

# Vérifier les arguments
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
  echo "Usage: $0 [brand_name]"
  echo ""
  echo "Résout les conflits de packages INDI"
  echo ""
  echo "Arguments:"
  echo "  brand_name    Nom de la marque (optionnel)"
  echo "                Marques supportées: player one, playerone"
  echo ""
  echo "Exemples:"
  echo "  $0                    # Résolution générale"
  echo "  $0 'player one'       # Résolution spécifique Player One"
  echo "  $0 playerone          # Résolution spécifique Player One"
  exit 0
fi

# Exécuter le script principal
main "$@"
