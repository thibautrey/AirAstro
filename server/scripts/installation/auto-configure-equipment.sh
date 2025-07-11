#!/bin/bash

# Script de configuration automatique des équipements au démarrage
# Ce script est appelé automatiquement par le serveur AirAstro

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/var/log/airastro-autoconfig.log"
LOCK_FILE="/tmp/airastro-autoconfig.lock"

# Fonction de logging
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Vérifier si le script est déjà en cours d'exécution
if [[ -f "$LOCK_FILE" ]]; then
    log "Configuration automatique déjà en cours (fichier verrou présent)"
    exit 0
fi

# Créer le fichier verrou
touch "$LOCK_FILE"

# Fonction de nettoyage
cleanup() {
    rm -f "$LOCK_FILE"
}

# Piège pour nettoyer le fichier verrou
trap cleanup EXIT

log "Démarrage de la configuration automatique des équipements"

# Fonction pour vérifier si un driver est déjà installé
is_driver_installed() {
    local driver_name="$1"
    dpkg -l | grep -q "^ii  $driver_name " 2>/dev/null
}

# Fonction pour installer un driver
install_driver() {
    local driver_name="$1"
    local device_name="$2"
    
    log "Installation du driver $driver_name pour $device_name..."
    
    if is_driver_installed "$driver_name"; then
        log "$driver_name est déjà installé"
        return 0
    fi
    
    # Vérifier si le package existe
    if ! apt-cache search "$driver_name" | grep -q "^$driver_name "; then
        log "Package $driver_name non trouvé dans les dépôts"
        return 1
    fi
    
    # Installer le package
    if sudo apt-get install -y "$driver_name" > /dev/null 2>&1; then
        log "Driver $driver_name installé avec succès"
        return 0
    else
        log "Échec de l'installation du driver $driver_name"
        return 1
    fi
}

# Fonction pour détecter et configurer les appareils USB
detect_usb_devices() {
    log "Détection des appareils USB..."
    
    # Obtenir la liste des appareils USB
    local usb_devices
    usb_devices=$(lsusb 2>/dev/null || echo "")
    
    if [[ -z "$usb_devices" ]]; then
        log "Aucun appareil USB détecté"
        return 0
    fi
    
    local devices_found=0
    local drivers_installed=0
    
    # Parcourir chaque appareil USB
    while IFS= read -r line; do
        if [[ -z "$line" ]]; then continue; fi
        
        # Extraire vendor:product ID
        if [[ $line =~ ID\ ([0-9a-fA-F]{4}):([0-9a-fA-F]{4}) ]]; then
            local vendor_id="${BASH_REMATCH[1]}"
            local product_id="${BASH_REMATCH[2]}"
            local device_id="${vendor_id}:${product_id}"
            
            # Extraire la description
            local description=$(echo "$line" | sed 's/.*ID [0-9a-fA-F]*:[0-9a-fA-F]* //')
            
            ((devices_found++))
            log "Appareil détecté: $device_id - $description"
            
            # Identifier le driver nécessaire
            local driver_name=""
            local device_type=""
            
            case "$vendor_id" in
                "03c3") # ZWO
                    driver_name="indi-asi"
                    device_type="Caméra ZWO ASI"
                    ;;
                "1618") # QHY
                    driver_name="indi-qhy"
                    device_type="Caméra QHY"
                    ;;
                "04a9") # Canon
                    driver_name="indi-gphoto"
                    device_type="Appareil photo Canon"
                    ;;
                "04b0") # Nikon
                    driver_name="indi-gphoto"
                    device_type="Appareil photo Nikon"
                    ;;
                "0403") # FTDI (utilisé par beaucoup de montures)
                    case "$product_id" in
                        "6001"|"6010"|"6011"|"6014"|"6015")
                            driver_name="indi-celestron"
                            device_type="Monture Celestron"
                            ;;
                        *)
                            driver_name="indi-eqmod"
                            device_type="Monture (FTDI)"
                            ;;
                    esac
                    ;;
                "067b") # Prolific (utilisé par Sky-Watcher)
                    driver_name="indi-eqmod"
                    device_type="Monture Sky-Watcher"
                    ;;
                "10c4") # Silicon Labs (utilisé par diverses montures)
                    driver_name="indi-eqmod"
                    device_type="Monture (Silicon Labs)"
                    ;;
                *)
                    # Essayer de détecter par la description
                    local desc_lower=$(echo "$description" | tr '[:upper:]' '[:lower:]')
                    if [[ $desc_lower =~ (camera|cam) ]]; then
                        driver_name="indi-gphoto"
                        device_type="Caméra générique"
                    elif [[ $desc_lower =~ (mount|telescope) ]]; then
                        driver_name="indi-eqmod"
                        device_type="Monture générique"
                    else
                        log "Appareil non reconnu: $device_id - $description"
                        continue
                    fi
                    ;;
            esac
            
            # Installer le driver si nécessaire
            if [[ -n "$driver_name" ]]; then
                if install_driver "$driver_name" "$device_type"; then
                    ((drivers_installed++))
                fi
            fi
        fi
    done <<< "$usb_devices"
    
    log "Détection terminée: $devices_found appareils trouvés, $drivers_installed drivers installés"
}

# Fonction pour configurer les permissions
configure_permissions() {
    log "Configuration des permissions..."
    
    # Vérifier si l'utilisateur courant est dans le groupe indi
    if ! groups | grep -q indi; then
        log "Ajout de l'utilisateur au groupe indi..."
        sudo usermod -a -G indi "$USER"
    fi
    
    # Recharger les règles udev
    sudo udevadm control --reload-rules 2>/dev/null || true
    sudo udevadm trigger 2>/dev/null || true
    
    log "Permissions configurées"
}

# Fonction pour vérifier l'état des services
check_services() {
    log "Vérification des services..."
    
    # Vérifier si le service INDI est actif
    if systemctl is-active --quiet indi.service; then
        log "Service INDI actif"
    else
        log "Le service INDI n'est pas actif"
        # Optionnel: démarrer le service
        # sudo systemctl start indi.service
    fi
}

# Fonction pour créer un rapport de configuration
create_report() {
    local report_file="/tmp/airastro-config-report.json"
    
    log "Création du rapport de configuration..."
    
    # Compter les drivers installés
    local indi_drivers
    indi_drivers=$(dpkg -l | grep -E "^ii\s+indi-" | wc -l)
    
    # Compter les appareils USB
    local usb_devices
    usb_devices=$(lsusb 2>/dev/null | wc -l)
    
    # Créer le rapport JSON
    cat > "$report_file" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "status": "completed",
  "drivers_installed": $indi_drivers,
  "usb_devices_detected": $usb_devices,
  "services": {
    "indi": "$(systemctl is-active indi.service 2>/dev/null || echo 'inactive')"
  }
}
EOF
    
    log "Rapport créé: $report_file"
}

# Fonction principale
main() {
    log "=== Configuration automatique des équipements ==="
    
    # Vérifier si nous sommes sur un système compatible
    if ! command -v lsusb > /dev/null 2>&1; then
        log "Commande lsusb non disponible, installation d'usbutils..."
        sudo apt-get update > /dev/null 2>&1
        sudo apt-get install -y usbutils > /dev/null 2>&1
    fi
    
    # Détecter et configurer les appareils
    detect_usb_devices
    configure_permissions
    check_services
    create_report
    
    log "Configuration automatique terminée"
    log "=== Fin de la configuration ==="
}

# Exécuter le script principal
main "$@"
