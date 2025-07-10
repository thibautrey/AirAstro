#!/bin/bash
set -e

# Script de mise à jour mDNS pour les installations existantes d'AirAstro
# Ce script peut être exécuté sur un Raspberry Pi existant pour ajouter la configuration mDNS

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

log() { echo -e "\033[1;32m[Update mDNS]\033[0m $*"; }
error() { echo -e "\033[1;31m[Error]\033[0m $*" >&2; }

log "Mise à jour de la configuration mDNS pour AirAstro"
echo "Répertoire d'installation : $INSTALL_DIR"
echo

# Vérification des privilèges
if [ "$(id -u)" -ne 0 ] && ! command -v sudo >/dev/null; then
  error "Ce script nécessite les privilèges root ou sudo"
  exit 1
fi

# Vérification que nous sommes sur un Raspberry Pi
if ! grep -q "Raspberry Pi" /proc/device-tree/model 2>/dev/null; then
  log "⚠️  Ce script est optimisé pour Raspberry Pi"
  read -p "Continuer quand même ? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log "Annulation de la mise à jour"
    exit 0
  fi
fi

# Vérification du répertoire d'installation
if [ ! -f "$INSTALL_DIR/server/package.json" ]; then
  error "Répertoire d'installation AirAstro non trouvé"
  error "Assurez-vous que le script est dans le bon répertoire"
  exit 1
fi

# Sauvegarde de la configuration actuelle
log "Sauvegarde de la configuration actuelle"
BACKUP_DIR="$INSTALL_DIR/backup-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

if [ -f "/etc/hostname" ]; then
  sudo cp "/etc/hostname" "$BACKUP_DIR/"
fi

if [ -f "/etc/hosts" ]; then
  sudo cp "/etc/hosts" "$BACKUP_DIR/"
fi

if [ -f "/etc/avahi/avahi-daemon.conf" ]; then
  sudo cp "/etc/avahi/avahi-daemon.conf" "$BACKUP_DIR/"
fi

log "Sauvegarde créée dans : $BACKUP_DIR"

# Arrêt temporaire du service AirAstro
log "Arrêt temporaire du service AirAstro"
sudo systemctl stop airastro.service 2>/dev/null || log "Service AirAstro non trouvé"

# Configuration mDNS
log "Application de la configuration mDNS"
if [ -f "$SCRIPT_DIR/configure-mdns.sh" ]; then
  sudo "$SCRIPT_DIR/configure-mdns.sh"
else
  error "Script configure-mdns.sh non trouvé"
  exit 1
fi

# Redémarrage du service AirAstro
log "Redémarrage du service AirAstro"
sudo systemctl start airastro.service 2>/dev/null || log "Service AirAstro non configuré"

# Attente de stabilisation
log "Attente de stabilisation des services"
sleep 5

# Vérification finale
log "Vérification de la configuration"
if [ -f "$SCRIPT_DIR/check-mdns.sh" ]; then
  "$SCRIPT_DIR/check-mdns.sh"
else
  log "Script de vérification non trouvé"
fi

echo
log "🎉 Mise à jour mDNS terminée avec succès !"
log ""
log "Votre AirAstro est maintenant accessible via :"
log "  - http://airastro.local (découverte automatique)"
log "  - http://$(hostname -I | awk '{print $1}') (IP locale)"
log ""
log "En cas de problème, la sauvegarde est disponible dans :"
log "  $BACKUP_DIR"
log ""
log "Un redémarrage est recommandé pour garantir la stabilité :"
log "  sudo reboot"
