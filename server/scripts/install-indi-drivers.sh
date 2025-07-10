#!/bin/bash

# Script d'installation automatique des drivers INDI pour AirAstro
# Ce script installe et configure les drivers INDI les plus courants

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Vérifier si on est sur un système Ubuntu/Debian
check_system() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        if [[ $ID != "ubuntu" && $ID != "debian" && $ID != "raspbian" ]]; then
            log_error "Ce script ne fonctionne que sur Ubuntu/Debian/Raspbian"
            exit 1
        fi
    else
        log_error "Impossible de détecter le système d'exploitation"
        exit 1
    fi
}

# Vérifier les privilèges sudo
check_sudo() {
    if ! sudo -n true 2>/dev/null; then
        log_error "Ce script nécessite des privilèges sudo"
        exit 1
    fi
}

# Mettre à jour les dépôts
update_repositories() {
    log_info "Mise à jour des dépôts..."
    sudo apt-get update > /dev/null 2>&1
    log_success "Dépôts mis à jour"
}

# Installer les dépendances de base
install_dependencies() {
    log_info "Installation des dépendances de base..."

    local packages=(
        "build-essential"
        "cmake"
        "git"
        "libnova-dev"
        "libcfitsio-dev"
        "libusb-1.0-0-dev"
        "zlib1g-dev"
        "libgsl-dev"
        "libraw-dev"
        "libgphoto2-dev"
        "libftdi1-dev"
        "libavcodec-dev"
        "libavformat-dev"
        "libswscale-dev"
        "libavutil-dev"
        "libjpeg-dev"
        "libpng-dev"
        "libtiff-dev"
        "libfftw3-dev"
        "libcurl4-gnutls-dev"
        "libgeos-dev"
    )

    for package in "${packages[@]}"; do
        if ! dpkg -l | grep -q "^ii  $package "; then
            log_info "Installation de $package..."
            sudo apt-get install -y "$package" > /dev/null 2>&1
        fi
    done

    log_success "Dépendances installées"
}

# Ajouter le dépôt INDI
add_indi_repository() {
    log_info "Ajout du dépôt INDI..."

    # Ajouter la clé GPG
    wget -qO - https://www.indilib.org/jdownloads/Ubuntu/indilib.gpg | sudo apt-key add -

    # Ajouter le dépôt
    echo "deb https://ppa.launchpadcontent.net/mutlaqja/ppa/ubuntu/ focal main" | sudo tee /etc/apt/sources.list.d/indi.list

    # Mettre à jour
    sudo apt-get update > /dev/null 2>&1

    log_success "Dépôt INDI ajouté"
}

# Installer INDI Core
install_indi_core() {
    log_info "Installation d'INDI Core..."

    local packages=(
        "indi-bin"
        "libindi1"
        "libindi-dev"
        "indi-data"
    )

    for package in "${packages[@]}"; do
        sudo apt-get install -y "$package" > /dev/null 2>&1
    done

    log_success "INDI Core installé"
}

# Installer TOUS les drivers INDI disponibles
install_all_indi_drivers() {
    log_info "Installation de TOUS les drivers INDI disponibles..."

    # Obtenir la liste complète des packages indi-* disponibles
    local available_drivers
    available_drivers=$(apt-cache search "^indi-" | grep -E "^indi-[a-zA-Z]" | awk '{print $1}' | sort)

    if [[ -z "$available_drivers" ]]; then
        log_error "Aucun driver INDI trouvé dans les dépôts"
        return 1
    fi

    local total_drivers
    total_drivers=$(echo "$available_drivers" | wc -l)
    log_info "Trouvé $total_drivers drivers INDI disponibles"

    local installed=0
    local failed=0
    local current=0

    # Installer chaque driver
    while read -r driver; do
        ((current++))
        log_info "[$current/$total_drivers] Installation de $driver..."

        # Vérifier si le driver est déjà installé
        if dpkg -l | grep -q "^ii  $driver "; then
            log_info "$driver déjà installé"
            ((installed++))
            continue
        fi

        # Installer le driver
        if sudo apt-get install -y "$driver" > /dev/null 2>&1; then
            ((installed++))
            log_success "✅ $driver installé"
        else
            log_warning "⚠️ Échec de l'installation de $driver"
            ((failed++))
        fi
    done <<< "$available_drivers"

    log_success "Installation terminée: $installed drivers installés avec succès ($failed échecs)"

    # Sauvegarder la liste des drivers installés
    echo "$available_drivers" > /tmp/indi-drivers-installed.txt

    return 0
}

# Fonction pour mettre à jour tous les drivers
update_all_indi_drivers() {
    log_info "Mise à jour de tous les drivers INDI..."

    # Mettre à jour la liste des packages
    sudo apt-get update > /dev/null 2>&1

    # Installer tous les nouveaux drivers disponibles
    install_all_indi_drivers

    # Mettre à jour les drivers existants
    sudo apt-get upgrade -y indi-* > /dev/null 2>&1

    log_success "Mise à jour terminée"
}

# Fonction pour installer des drivers spécifiques en priorité
install_priority_drivers() {
    log_info "Installation des drivers prioritaires..."

    local priority_drivers=(
        "indi-asi"           # ZWO ASI cameras - PRIORITAIRE
        "indi-qhy"           # QHY cameras - PRIORITAIRE
        "indi-gphoto"        # Canon/Nikon DSLR - PRIORITAIRE
        "indi-eqmod"         # Sky-Watcher/Orion mounts - PRIORITAIRE
        "indi-celestron"     # Celestron mounts - PRIORITAIRE
        "indi-sbig"          # SBIG cameras
        "indi-sx"            # Starlight Express
        "indi-inovaplx"      # iNova PLX
        "indi-fishcamp"      # Fishcamp cameras
        "indi-fli"           # Finger Lakes Instruments
        "indi-apogee"        # Apogee cameras
        "indi-mi"            # Moravian Instruments
        "indi-toupbase"      # ToupTek cameras
        "indi-playerone"     # Player One cameras
        "indi-aagcloudwatcher" # AAG Cloud Watcher
        "indi-aok"           # AOK focusers
        "indi-armadillo"     # Armadillo focusers
        "indi-astromechfoc"  # Astromech focusers
        "indi-deepskydad"    # DeepSkyDad equipment
        "indi-dreamfocuser"  # Dream focusers
        "indi-duino"         # Arduino-based equipment
        "indi-maxdome"       # MaxDome
        "indi-nexdome"       # NexDome
        "indi-rolloffino"    # RollOff roof
        "indi-shelyak"       # Shelyak spectrographs
        "indi-spectracyber"  # SpectraCyber
        "indi-starbook"      # Vixen Starbook
        "indi-takahashi"     # Takahashi mounts
        "indi-watchdog"      # Watchdog
        "indi-weewx"         # WeeWX weather
    )

    local installed=0
    local failed=0

    for driver in "${priority_drivers[@]}"; do
        log_info "Installation prioritaire de $driver..."
        if sudo apt-get install -y "$driver" > /dev/null 2>&1; then
            ((installed++))
            log_success "✅ $driver installé"
        else
            log_warning "⚠️ Échec de l'installation de $driver"
            ((failed++))
        fi
    done

    log_success "$installed drivers prioritaires installés avec succès ($failed échecs)"
}

# Configurer les permissions USB
configure_usb_permissions() {
    log_info "Configuration des permissions USB..."

    # Créer le groupe indi si nécessaire
    if ! getent group indi > /dev/null 2>&1; then
        sudo groupadd indi
    fi

    # Ajouter l'utilisateur actuel au groupe indi
    sudo usermod -a -G indi "$USER"

    # Créer les règles udev pour les appareils astronomiques
    cat << 'EOF' | sudo tee /etc/udev/rules.d/99-astro-devices.rules > /dev/null
# ZWO ASI cameras
SUBSYSTEM=="usb", ATTR{idVendor}=="03c3", GROUP="indi", MODE="0664"

# QHY cameras
SUBSYSTEM=="usb", ATTR{idVendor}=="1618", GROUP="indi", MODE="0664"

# Canon cameras
SUBSYSTEM=="usb", ATTR{idVendor}=="04a9", GROUP="indi", MODE="0664"

# Nikon cameras
SUBSYSTEM=="usb", ATTR{idVendor}=="04b0", GROUP="indi", MODE="0664"

# Celestron mounts
SUBSYSTEM=="usb", ATTR{idVendor}=="0403", GROUP="indi", MODE="0664"

# FTDI devices (utilisés par beaucoup de montures)
SUBSYSTEM=="usb", ATTR{idVendor}=="0403", GROUP="indi", MODE="0664"

# Prolific devices
SUBSYSTEM=="usb", ATTR{idVendor}=="067b", GROUP="indi", MODE="0664"

# Generic USB-to-serial converters
SUBSYSTEM=="tty", ATTRS{idVendor}=="0403", GROUP="indi", MODE="0664"
SUBSYSTEM=="tty", ATTRS{idVendor}=="067b", GROUP="indi", MODE="0664"
SUBSYSTEM=="tty", ATTRS{idVendor}=="10c4", GROUP="indi", MODE="0664"
SUBSYSTEM=="tty", ATTRS{idVendor}=="1a86", GROUP="indi", MODE="0664"
EOF

    # Recharger les règles udev
    sudo udevadm control --reload-rules
    sudo udevadm trigger

    log_success "Permissions USB configurées"
}

# Créer un service systemd pour INDI server
create_indi_service() {
    log_info "Création du service INDI..."

    cat << 'EOF' | sudo tee /etc/systemd/system/indi.service > /dev/null
[Unit]
Description=INDI Server
After=network.target

[Service]
Type=simple
User=indi
Group=indi
ExecStart=/usr/bin/indiserver -p 7624
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

    # Créer l'utilisateur indi si nécessaire
    if ! id "indi" > /dev/null 2>&1; then
        sudo useradd -r -s /bin/false -d /var/lib/indi indi
        sudo mkdir -p /var/lib/indi
        sudo chown indi:indi /var/lib/indi
    fi

    # Activer le service
    sudo systemctl daemon-reload
    sudo systemctl enable indi.service

    log_success "Service INDI créé"
}

# Fonction principale
main() {
    log_info "Démarrage de l'installation automatique des drivers INDI pour AirAstro"

    # Vérifier le mode d'installation
    local install_mode="${1:-full}"

    check_system
    check_sudo
    update_repositories
    install_dependencies
    add_indi_repository
    install_indi_core

    case "$install_mode" in
        "priority")
            log_info "Mode installation prioritaire"
            install_priority_drivers
            ;;
        "update")
            log_info "Mode mise à jour"
            update_all_indi_drivers
            ;;
        "full"|*)
            log_info "Mode installation complète"
            install_priority_drivers
            install_all_indi_drivers
            ;;
    esac

    configure_usb_permissions
    create_indi_service

    log_success "Installation terminée avec succès!"
    log_info "Notes importantes:"
    log_info "1. Redémarrez le système pour que les permissions USB prennent effet"
    log_info "2. Les drivers seront disponibles via l'API AirAstro"
    log_info "3. Le service INDI est maintenant disponible sur le port 7624"
    log_info "4. Pour voir tous les drivers installés: dpkg -l | grep indi-"
    log_warning "Vous devez vous déconnecter et reconnecter pour que les permissions groupes prennent effet"
}

# Exécuter le script
main "$@"
