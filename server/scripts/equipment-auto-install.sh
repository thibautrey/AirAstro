#!/bin/bash

# Script principal pour la détection et l'installation automatique des équipements
# Utilisation: ./equipment-auto-install.sh [--dry-run] [--force]

set -e

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
BRANDS_DIR="$SCRIPT_DIR/brands"

log() { echo -e "\033[1;32m[Equipment Auto-Install]\033[0m $*"; }
error() { echo -e "\033[1;31m[Error]\033[0m $*" >&2; }
warn() { echo -e "\033[1;33m[Warning]\033[0m $*"; }

# Variables de configuration
DRY_RUN=false
FORCE_INSTALL=false
DETECTED_BRANDS=()
SUCCESSFUL_INSTALLS=()
FAILED_INSTALLS=()
SKIPPED_INSTALLS=()

# Fonction pour analyser les arguments
parse_arguments() {
  while [[ $# -gt 0 ]]; do
    case $1 in
      --dry-run)
        DRY_RUN=true
        log "Mode dry-run activé - aucune installation ne sera effectuée"
        shift
        ;;
      --force)
        FORCE_INSTALL=true
        log "Mode force activé - installation forcée même en cas de conflits"
        shift
        ;;
      --help|-h)
        show_help
        exit 0
        ;;
      *)
        warn "Option inconnue: $1"
        shift
        ;;
    esac
  done
}

# Fonction d'aide
show_help() {
  cat << EOF
Usage: $0 [OPTIONS]

Détecte automatiquement les équipements astronomiques connectés et installe
leurs drivers INDI correspondants.

OPTIONS:
  --dry-run     Affiche ce qui serait fait sans rien installer
  --force       Force l'installation même en cas de conflits connus
  --help, -h    Affiche cette aide

MARQUES SUPPORTÉES:
  - ZWO ASI (caméras)
  - QHY (caméras)  
  - Player One (caméras) - Installation manuelle recommandée
  - Canon (DSLR via GPhoto)
  - Nikon (DSLR via GPhoto)
  - Celestron (télescopes)
  - SkyWatcher (montures)
  - Pegasus Astro (boîtiers d'alimentation)
  - SVBony (caméras)

EXAMPLES:
  $0                    # Détection et installation automatique
  $0 --dry-run          # Voir ce qui serait installé
  $0 --force            # Forcer l'installation (y compris Player One)
EOF
}

# Fonction pour détecter les équipements connectés
detect_equipment() {
  log "Détection des équipements astronomiques connectés..."
  
  # Vérifier si lsusb est disponible
  if ! command -v lsusb >/dev/null 2>&1; then
    error "lsusb n'est pas disponible. Installation requise: sudo apt-get install usbutils"
    exit 1
  fi
  
  # Obtenir la liste des périphériques USB
  local usb_devices
  usb_devices=$(lsusb 2>/dev/null) || {
    error "Erreur lors de la lecture des périphériques USB"
    exit 1
  }
  
  # Détecter chaque marque
  detect_zwo_asi "$usb_devices"
  detect_qhy "$usb_devices"
  detect_player_one "$usb_devices"
  detect_canon "$usb_devices"
  detect_nikon "$usb_devices"
  detect_celestron "$usb_devices"
  detect_skywatcher "$usb_devices"
  detect_pegasus "$usb_devices"
  detect_svbony "$usb_devices"
  
  if [ ${#DETECTED_BRANDS[@]} -eq 0 ]; then
    log "Aucun équipement astronomique détecté"
    return 0
  fi
  
  log "Équipements détectés: ${DETECTED_BRANDS[*]}"
}

# Fonctions de détection par marque
detect_zwo_asi() {
  local usb_devices="$1"
  if echo "$usb_devices" | grep -q "03c3"; then
    log "✅ Caméras ZWO ASI détectées"
    DETECTED_BRANDS+=("zwo-asi")
  fi
}

detect_qhy() {
  local usb_devices="$1"
  if echo "$usb_devices" | grep -q "1618"; then
    log "✅ Caméras QHY détectées"
    DETECTED_BRANDS+=("qhy")
  fi
}

detect_player_one() {
  local usb_devices="$1"
  if echo "$usb_devices" | grep -q "a0a0"; then
    log "✅ Caméras Player One détectées"
    DETECTED_BRANDS+=("player-one")
  fi
}

detect_canon() {
  local usb_devices="$1"
  if echo "$usb_devices" | grep -q "04a9"; then
    log "✅ Caméras Canon détectées"
    DETECTED_BRANDS+=("canon")
  fi
}

detect_nikon() {
  local usb_devices="$1"
  if echo "$usb_devices" | grep -q "04b0"; then
    log "✅ Caméras Nikon détectées"
    DETECTED_BRANDS+=("nikon")
  fi
}

detect_celestron() {
  local usb_devices="$1"
  if echo "$usb_devices" | grep -q "0525"; then
    log "✅ Télescopes Celestron détectés"
    DETECTED_BRANDS+=("celestron")
  fi
}

detect_skywatcher() {
  local usb_devices="$1"
  # SkyWatcher utilise souvent les mêmes vendor IDs que Celestron
  if echo "$usb_devices" | grep -q "0525"; then
    # Vérifier si c'est vraiment SkyWatcher en regardant la description
    if echo "$usb_devices" | grep -i "skywatcher\|eq6\|eq5\|az-eq" >/dev/null; then
      log "✅ Montures SkyWatcher détectées"
      DETECTED_BRANDS+=("skywatcher")
    fi
  fi
}

detect_pegasus() {
  local usb_devices="$1"
  if echo "$usb_devices" | grep -q "0483"; then
    log "✅ Équipements Pegasus Astro détectés"
    DETECTED_BRANDS+=("pegasus")
  fi
}

detect_svbony() {
  local usb_devices="$1"
  if echo "$usb_devices" | grep -q "0547"; then
    log "✅ Caméras SVBony détectées"
    DETECTED_BRANDS+=("svbony")
  fi
}

# Fonction pour installer les drivers d'une marque
install_brand_drivers() {
  local brand="$1"
  local brand_script="$BRANDS_DIR/$brand/install-$brand.sh"
  
  log "Installation des drivers pour: $brand"
  
  # Vérifier si le script d'installation existe
  if [ ! -f "$brand_script" ]; then
    warn "Script d'installation non trouvé pour $brand: $brand_script"
    FAILED_INSTALLS+=("$brand (script manquant)")
    return 1
  fi
  
  # Vérifier les permissions
  if [ ! -x "$brand_script" ]; then
    chmod +x "$brand_script"
  fi
  
  # Mode dry-run
  if [ "$DRY_RUN" = true ]; then
    log "DRY-RUN: Exécuterait $brand_script"
    return 0
  fi
  
  # Gestion spéciale pour Player One (conflits connus)
  if [ "$brand" = "player-one" ] && [ "$FORCE_INSTALL" = false ]; then
    warn "Player One détecté mais installation automatique désactivée"
    warn "Raison: Conflits de packages connus entre libplayerone et libplayeronecamera2"
    warn "Utilisez --force pour forcer l'installation ou installez manuellement"
    SKIPPED_INSTALLS+=("$brand (conflits connus)")
    return 0
  fi
  
  # Exécuter le script d'installation
  log "Exécution de $brand_script..."
  if "$brand_script"; then
    log "✅ Installation réussie pour $brand"
    SUCCESSFUL_INSTALLS+=("$brand")
    return 0
  else
    error "❌ Échec de l'installation pour $brand"
    FAILED_INSTALLS+=("$brand")
    return 1
  fi
}

# Fonction pour installer tous les drivers détectés
install_all_detected() {
  if [ ${#DETECTED_BRANDS[@]} -eq 0 ]; then
    log "Aucun équipement à installer"
    return 0
  fi
  
  log "Installation des drivers pour ${#DETECTED_BRANDS[@]} marque(s) détectée(s)..."
  
  for brand in "${DETECTED_BRANDS[@]}"; do
    install_brand_drivers "$brand"
  done
}

# Fonction pour afficher le résumé final
show_summary() {
  log "==================== RÉSUMÉ ===================="
  log "Marques détectées: ${#DETECTED_BRANDS[@]}"
  log "Installations réussies: ${#SUCCESSFUL_INSTALLS[@]}"
  log "Installations échouées: ${#FAILED_INSTALLS[@]}"
  log "Installations ignorées: ${#SKIPPED_INSTALLS[@]}"
  
  if [ ${#SUCCESSFUL_INSTALLS[@]} -gt 0 ]; then
    log "✅ Succès: ${SUCCESSFUL_INSTALLS[*]}"
  fi
  
  if [ ${#FAILED_INSTALLS[@]} -gt 0 ]; then
    error "❌ Échecs: ${FAILED_INSTALLS[*]}"
  fi
  
  if [ ${#SKIPPED_INSTALLS[@]} -gt 0 ]; then
    warn "⚠️  Ignorés: ${SKIPPED_INSTALLS[*]}"
  fi
  
  log "================================================="
}

# Fonction principale
main() {
  log "Démarrage de l'installation automatique des équipements astronomiques"
  
  # Analyser les arguments
  parse_arguments "$@"
  
  # Vérifier que le dossier des marques existe
  if [ ! -d "$BRANDS_DIR" ]; then
    error "Dossier des marques non trouvé: $BRANDS_DIR"
    exit 1
  fi
  
  # Détecter les équipements
  detect_equipment
  
  # Installer les drivers
  install_all_detected
  
  # Afficher le résumé
  show_summary
  
  # Code de sortie basé sur les résultats
  if [ ${#FAILED_INSTALLS[@]} -gt 0 ]; then
    exit 1
  else
    exit 0
  fi
}

# Exécuter le script principal
main "$@"
