#!/bin/bash
set -e

# Script d'auto-installation et configuration des drivers ASI
# DÉPRÉCIÉ: Utilisez plutôt ./equipment-manager.sh install asi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Source des fonctions communes
if [ -f "$PROJECT_ROOT/scripts/airastro-common.sh" ]; then
    source "$PROJECT_ROOT/scripts/airastro-common.sh"
else
    # Fallback pour les fonctions de base
    log() { echo -e "\033[1;32m[Auto Install ASI]\033[0m $*"; }
    warning() { echo -e "\033[1;33m[Warning]\033[0m $*"; }
    error() { echo -e "\033[1;31m[Error]\033[0m $*"; }
    success() { echo -e "\033[1;32m[Success]\033[0m $*"; }
fi

# Avertissement de dépréciation
warning "⚠️  Ce script est déprécié!"
echo "Utilisez plutôt le nouveau gestionnaire d'équipements:"
echo "  ./equipment-manager.sh install asi"
echo

# Vérifier la variable d'environnement AUTO_ACCEPT
if [ "$AUTO_ACCEPT" = "yes" ] || [ "$AIRASTRO_AUTO_INSTALL" = "true" ]; then
    echo "Mode auto-acceptation activé, utilisation du nouveau script..."
    if [ -f "$PROJECT_ROOT/scripts/equipment-manager.sh" ]; then
        exec "$PROJECT_ROOT/scripts/equipment-manager.sh" install asi
    else
        warning "Script equipment-manager.sh non trouvé, continuation avec le script actuel"
    fi
else
    echo "Continuez avec ce script? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "Utilisation du nouveau script..."
        if [ -f "$PROJECT_ROOT/scripts/equipment-manager.sh" ]; then
            exec "$PROJECT_ROOT/scripts/equipment-manager.sh" install asi
        else
            error "Script equipment-manager.sh non trouvé"
            exit 1
        fi
    fi
fi

log "🚀 Auto-installation et configuration des drivers ASI"
echo

# 1. Vérification de l'environnement
log "1. Vérification de l'environnement"
if ! command -v apt-get >/dev/null 2>&1; then
    error "❌ apt-get non disponible. Ce script nécessite Debian/Ubuntu."
    exit 1
fi

if [ "$EUID" -eq 0 ]; then
    warning "⚠️  Exécution en tant que root. Recommandé d'utiliser sudo."
fi

# 2. Mise à jour des paquets
log "2. Mise à jour des paquets"
sudo apt-get update -qq

# 3. Installation des dépendances de base
log "3. Installation des dépendances de base"
DEPENDENCIES=(
    "build-essential"
    "cmake"
    "pkg-config"
    "libindi-dev"
    "libnova-dev"
    "libcfitsio-dev"
    "libusb-1.0-0-dev"
    "zlib1g-dev"
    "libgsl-dev"
    "libjpeg-dev"
    "libcurl4-gnutls-dev"
)

for dep in "${DEPENDENCIES[@]}"; do
    if ! dpkg -l | grep -q "^ii  $dep "; then
        echo "   Installation de $dep..."
        sudo apt-get install -y "$dep"
    else
        echo "   ✅ $dep déjà installé"
    fi
done

# 4. Installation spécifique des drivers ASI
log "4. Installation des drivers ASI"

# Installer les paquets principaux
ASI_PACKAGES=(
    "indi-asi"
    "libasi"
    "indi-bin"
)

for package in "${ASI_PACKAGES[@]}"; do
    if ! dpkg -l | grep -q "^ii  $package "; then
        echo "   Installation de $package..."
        sudo apt-get install -y "$package" || {
            warning "   Installation via apt échouée pour $package"
            echo "   Tentative d'installation manuelle..."
            
            case $package in
                "libasi")
                    # Installation manuelle de la librairie ASI
                    ASI_SDK_URL="https://download.zwoastro.com/ASI_SDK/ASI_linux_mac_SDK_V1.30.tar.bz2"
                    echo "   Téléchargement du SDK ASI..."
                    wget -q "$ASI_SDK_URL" -O /tmp/asi_sdk.tar.bz2
                    cd /tmp
                    tar -xjf asi_sdk.tar.bz2
                    
                    # Installer les librairies
                    if [ -d "ASI_linux_mac_SDK_V1.30" ]; then
                        cd ASI_linux_mac_SDK_V1.30
                        if [ -d "lib" ]; then
                            echo "   Installation des librairies ASI..."
                            sudo cp lib/x64/* /usr/local/lib/ 2>/dev/null || sudo cp lib/armv8/* /usr/local/lib/ 2>/dev/null || sudo cp lib/armv7/* /usr/local/lib/ 2>/dev/null || true
                            sudo ldconfig
                        fi
                        if [ -d "include" ]; then
                            echo "   Installation des headers ASI..."
                            sudo cp -r include/* /usr/local/include/ 2>/dev/null || true
                        fi
                    fi
                    ;;
                "indi-asi")
                    # Compilation depuis les sources si nécessaire
                    echo "   Compilation d'INDI ASI depuis les sources..."
                    cd /tmp
                    git clone https://github.com/indilib/indi-3rdparty.git || true
                    cd indi-3rdparty
                    mkdir -p build
                    cd build
                    cmake -DCMAKE_INSTALL_PREFIX=/usr -DBUILD_LIBS=1 -DWITH_ASI=ON ..
                    make -j$(nproc)
                    sudo make install
                    ;;
            esac
        }
    else
        echo "   ✅ $package déjà installé"
    fi
done

# 5. Vérification des drivers installés
log "5. Vérification des drivers installés"
DRIVER_LOCATIONS=(
    "/usr/bin/indi_asi_ccd"
    "/usr/local/bin/indi_asi_ccd"
    "/usr/lib/indi/indi_asi_ccd"
    "/usr/local/lib/indi/indi_asi_ccd"
)

ASI_DRIVER_FOUND=false
for location in "${DRIVER_LOCATIONS[@]}"; do
    if [ -f "$location" ] && [ -x "$location" ]; then
        success "✅ Driver ASI CCD trouvé: $location"
        ASI_DRIVER_FOUND=true
        DRIVER_PATH="$location"
        break
    fi
done

if [ "$ASI_DRIVER_FOUND" = false ]; then
    error "❌ Driver ASI CCD non trouvé"
    echo "   Recherche manuelle..."
    MANUAL_SEARCH=$(find /usr /opt -name "indi_asi_ccd" -type f -executable 2>/dev/null | head -1)
    if [ -n "$MANUAL_SEARCH" ]; then
        success "✅ Driver trouvé manuellement: $MANUAL_SEARCH"
        DRIVER_PATH="$MANUAL_SEARCH"
        ASI_DRIVER_FOUND=true
    else
        error "❌ Impossible de trouver le driver ASI CCD"
        exit 1
    fi
fi

# 6. Test du driver
log "6. Test du driver ASI"
echo "   Test de démarrage du driver..."
timeout 5s "$DRIVER_PATH" -v 2>&1 | head -10 | sed 's/^/   /' || {
    warning "⚠️  Test du driver échoué ou timeout"
    echo "   Cela peut être normal si aucune caméra n'est connectée"
}

# 7. Configuration des permissions USB
log "7. Configuration des permissions USB"
UDEV_RULES_FILE="/etc/udev/rules.d/99-asi-cameras.rules"

if [ ! -f "$UDEV_RULES_FILE" ]; then
    echo "   Création des règles udev pour les caméras ASI..."
    sudo tee "$UDEV_RULES_FILE" > /dev/null << 'EOF'
# Règles udev pour les caméras ZWO ASI
SUBSYSTEM=="usb", ATTRS{idVendor}=="03c3", MODE="0666", GROUP="plugdev"
SUBSYSTEM=="usb", ATTRS{idVendor}=="03c3", ATTRS{idProduct}=="120d", MODE="0666", GROUP="plugdev", SYMLINK+="asi120mm-s"
SUBSYSTEM=="usb", ATTRS{idVendor}=="03c3", ATTRS{idProduct}=="120c", MODE="0666", GROUP="plugdev", SYMLINK+="asi120mc-s"
EOF

    echo "   Rechargement des règles udev..."
    sudo udevadm control --reload-rules
    sudo udevadm trigger
    
    success "✅ Règles udev créées et appliquées"
else
    success "✅ Règles udev déjà présentes"
fi

# 8. Ajout de l'utilisateur au groupe plugdev
log "8. Configuration des groupes utilisateur"
CURRENT_USER=$(whoami)
if ! groups "$CURRENT_USER" | grep -q plugdev; then
    echo "   Ajout de l'utilisateur $CURRENT_USER au groupe plugdev..."
    sudo usermod -a -G plugdev "$CURRENT_USER"
    success "✅ Utilisateur ajouté au groupe plugdev"
    warning "⚠️  Vous devez vous reconnecter pour que les changements de groupe prennent effet"
else
    success "✅ Utilisateur déjà dans le groupe plugdev"
fi

# 9. Création d'un script de test
log "9. Création d'un script de test"
TEST_SCRIPT="/tmp/test-asi-driver.sh"
cat > "$TEST_SCRIPT" << EOF
#!/bin/bash
echo "🧪 Test du driver ASI"
echo "Driver path: $DRIVER_PATH"
echo "Caméras USB ASI connectées:"
lsusb | grep "03c3" || echo "Aucune caméra ASI détectée"
echo
echo "Test du driver (timeout 10s):"
timeout 10s "$DRIVER_PATH" -v || echo "Test terminé"
EOF

chmod +x "$TEST_SCRIPT"
success "✅ Script de test créé: $TEST_SCRIPT"

# 10. Vérification finale
log "10. Vérification finale"
echo "   Résumé de l'installation:"
echo "   - Driver ASI CCD: $DRIVER_PATH"
echo "   - Règles udev: $UDEV_RULES_FILE"
echo "   - Script de test: $TEST_SCRIPT"
echo

# Test de détection de caméra
if lsusb | grep -q "03c3:120d"; then
    success "✅ Caméra ASI120MM-S détectée"
elif lsusb | grep -q "03c3"; then
    success "✅ Caméra ASI détectée (autre modèle)"
else
    warning "⚠️  Aucune caméra ASI détectée"
    echo "   Vérifiez que la caméra est connectée"
fi

echo
success "🎉 Installation terminée avec succès!"
echo
echo "Prochaines étapes:"
echo "1. Reconnectez-vous si vous avez été ajouté au groupe plugdev"
echo "2. Redémarrez le service AirAstro: sudo systemctl restart airastro.service"
echo "3. Vérifiez la détection dans l'interface web"
echo "4. Utilisez le script de test: $TEST_SCRIPT"
echo
echo "Commandes utiles:"
echo "- Lister les caméras: lsusb | grep 03c3"
echo "- Tester le driver: $DRIVER_PATH -v"
echo "- Vérifier les permissions: ls -la /dev/bus/usb/*/*"
