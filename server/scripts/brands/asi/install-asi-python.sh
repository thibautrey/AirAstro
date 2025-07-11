#!/bin/bash
set -e

# Script d'installation du support Python pour les caméras ZWO ASI
# Partie spécifique au SDK Python (complément du driver INDI)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Source des fonctions communes
source "$PROJECT_ROOT/scripts/core/airastro-common.sh"

log_info "Installation du support Python pour les caméras ZWO ASI"
echo

# Vérifier l'architecture du système
ARCH=$(uname -m)
log_info "Architecture détectée: $ARCH"

# Détecter la version Python
PYTHON_CMD="python3"
if ! command -v "$PYTHON_CMD" >/dev/null 2>&1; then
    log_error "Python3 n'est pas installé"
    exit 1
fi

PYTHON_VERSION=$($PYTHON_CMD --version 2>&1 | cut -d' ' -f2)
log_info "Python version: $PYTHON_VERSION"

# 1. Installation des dépendances système
log_info "Installation des dépendances système"
sudo apt-get update -qq

DEPENDENCIES=(
    "python3-pip"
    "python3-dev"
    "python3-setuptools"
    "python3-wheel"
    "build-essential"
    "libusb-1.0-0-dev"
    "pkg-config"
)

for dep in "${DEPENDENCIES[@]}"; do
    if ! dpkg -l | grep -q "^ii  $dep "; then
        log_info "Installation de $dep..."
        sudo apt-get install -y "$dep"
    else
        log_success "$dep déjà installé"
    fi
done

# 2. Installation du SDK ZWO ASI natif
log_info "Installation du SDK ZWO ASI natif"

# Détecter la bonne architecture pour le SDK
case "$ARCH" in
    "aarch64"|"arm64")
        ASI_LIB_ARCH="armv8"
        ;;
    "armv7l"|"armhf")
        ASI_LIB_ARCH="armv7"
        ;;
    "x86_64"|"amd64")
        ASI_LIB_ARCH="x64"
        ;;
    *)
        log_warning "Architecture non reconnue: $ARCH, tentative avec armv8"
        ASI_LIB_ARCH="armv8"
        ;;
esac

log_info "Architecture SDK: $ASI_LIB_ARCH"

# Vérifier si la bibliothèque est déjà installée
LIB_PATHS=(
    "/usr/local/lib/libASICamera2.so"
    "/usr/lib/aarch64-linux-gnu/libASICamera2.so"
    "/usr/lib/arm-linux-gnueabihf/libASICamera2.so"
    "/usr/lib/x86_64-linux-gnu/libASICamera2.so"
)

ASI_LIB_FOUND=false
ASI_LIB_PATH=""

for path in "${LIB_PATHS[@]}"; do
    if [ -f "$path" ]; then
        ASI_LIB_FOUND=true
        ASI_LIB_PATH="$path"
        log_success "Bibliothèque ASI trouvée: $path"
        break
    fi
done

if [ "$ASI_LIB_FOUND" = false ]; then
    log_info "Téléchargement et installation du SDK ZWO ASI"

    # Télécharger le SDK
    ASI_SDK_URL="https://download.zwoastro.com/ASI_SDK/ASI_linux_mac_SDK_V1.30.tar.bz2"
    ASI_SDK_FILE="/tmp/asi_sdk.tar.bz2"

    if [ -f "$ASI_SDK_FILE" ]; then
        rm -f "$ASI_SDK_FILE"
    fi

    log_info "Téléchargement du SDK depuis $ASI_SDK_URL"
    wget -q --show-progress "$ASI_SDK_URL" -O "$ASI_SDK_FILE"

    # Extraire et installer
    cd /tmp
    tar -xjf "$ASI_SDK_FILE"

    SDK_DIR=$(find /tmp -name "ASI_linux_mac_SDK_V*" -type d | head -1)
    if [ -z "$SDK_DIR" ]; then
        log_error "Impossible de trouver le répertoire du SDK extrait"
        exit 1
    fi

    log_info "Installation depuis $SDK_DIR"
    cd "$SDK_DIR"

    # Installer les bibliothèques
    if [ -d "lib/$ASI_LIB_ARCH" ]; then
        log_info "Installation des bibliothèques $ASI_LIB_ARCH"
        sudo cp lib/$ASI_LIB_ARCH/* /usr/local/lib/
        sudo ldconfig
        ASI_LIB_PATH="/usr/local/lib/libASICamera2.so"
    else
        log_error "Architecture $ASI_LIB_ARCH non trouvée dans le SDK"
        log_info "Architectures disponibles:"
        ls -la lib/
        exit 1
    fi

    # Installer les headers
    if [ -d "include" ]; then
        log_info "Installation des headers"
        sudo cp -r include/* /usr/local/include/
    fi

    # Nettoyer
    rm -rf /tmp/asi_sdk.tar.bz2 "$SDK_DIR"

    log_success "SDK ZWO ASI installé avec succès"
else
    # Créer un lien symbolique si nécessaire
    if [ ! -L "/usr/local/lib/libASICamera2.so" ] && [ "$ASI_LIB_PATH" != "/usr/local/lib/libASICamera2.so" ]; then
        log_info "Création d'un lien symbolique vers $ASI_LIB_PATH"
        sudo ln -sf "$ASI_LIB_PATH" /usr/local/lib/libASICamera2.so
        ASI_LIB_PATH="/usr/local/lib/libASICamera2.so"
    fi
fi

# 3. Installation du module Python zwoasi
log_info "Installation du module Python zwoasi"

# Vérifier si le module est déjà installé
if $PYTHON_CMD -c "import zwoasi" 2>/dev/null; then
    log_success "Module zwoasi déjà installé"
else
    log_info "Installation du module zwoasi via pip"
    $PYTHON_CMD -m pip install --user zwoasi

    # Vérifier l'installation
    if $PYTHON_CMD -c "import zwoasi" 2>/dev/null; then
        log_success "Module zwoasi installé avec succès"
    else
        log_error "Échec de l'installation du module zwoasi"
        exit 1
    fi
fi

# 4. Configuration des permissions (si pas déjà fait)
log_info "Vérification des permissions USB"

UDEV_RULES_FILE="/etc/udev/rules.d/99-asi-cameras.rules"
if [ ! -f "$UDEV_RULES_FILE" ]; then
    log_info "Création des règles udev pour les caméras ASI"
    sudo tee "$UDEV_RULES_FILE" > /dev/null << 'EOF'
# Règles udev pour les caméras ZWO ASI
SUBSYSTEM=="usb", ATTRS{idVendor}=="03c3", MODE="0666", GROUP="plugdev"
ACTION=="add", ATTR{idVendor}=="03c3", RUN+="/bin/sh -c '/bin/echo 200 >/sys/module/usbcore/parameters/usbfs_memory_mb'"
EOF

    sudo udevadm control --reload-rules
    sudo udevadm trigger
    log_success "Règles udev créées et appliquées"
else
    log_success "Règles udev déjà présentes"
fi

# Vérifier que l'utilisateur est dans le groupe plugdev
CURRENT_USER=$(whoami)
if ! groups "$CURRENT_USER" | grep -q plugdev; then
    log_info "Ajout de l'utilisateur $CURRENT_USER au groupe plugdev"
    sudo usermod -a -G plugdev "$CURRENT_USER"
    log_warning "Vous devez vous reconnecter pour que les changements prennent effet"
else
    log_success "Utilisateur déjà dans le groupe plugdev"
fi

# 5. Création d'un script de test Python
log_info "Création d'un script de test Python"

TEST_SCRIPT="/tmp/test-asi-python.py"
cat > "$TEST_SCRIPT" << EOF
#!/usr/bin/env python3
"""
Script de test pour les caméras ZWO ASI avec Python
"""

import sys
import os
import time

def test_asi_python():
    print("🧪 Test du support Python pour les caméras ZWO ASI")
    print("=" * 60)

    # Test 1: Import du module
    try:
        import zwoasi as asi
        print("✅ Module zwoasi importé avec succès")
    except ImportError as e:
        print(f"❌ Échec de l'import zwoasi: {e}")
        return False

    # Test 2: Initialisation de la bibliothèque
    lib_path = "$ASI_LIB_PATH"
    if not os.path.exists(lib_path):
        # Essayer d'autres emplacements
        for path in ["/usr/local/lib/libASICamera2.so",
                     "/usr/lib/aarch64-linux-gnu/libASICamera2.so",
                     "/usr/lib/arm-linux-gnueabihf/libASICamera2.so"]:
            if os.path.exists(path):
                lib_path = path
                break

    print(f"📚 Utilisation de la bibliothèque: {lib_path}")

    try:
        asi.init(lib_path)
        print("✅ Bibliothèque ASI initialisée avec succès")
    except Exception as e:
        print(f"❌ Échec de l'initialisation: {e}")
        return False

    # Test 3: Détection des caméras
    try:
        cameras = asi.list_cameras()
        print(f"🎥 Caméras détectées: {len(cameras)}")

        if cameras:
            for i, camera_info in enumerate(cameras):
                print(f"   Caméra {i}: {camera_info}")
        else:
            print("⚠️  Aucune caméra détectée (vérifiez la connexion)")
            return True  # Pas d'erreur si pas de caméra connectée

    except Exception as e:
        print(f"❌ Erreur lors de la détection: {e}")
        return False

    # Test 4: Connexion à la première caméra si disponible
    if cameras:
        try:
            print("\n🔌 Test de connexion à la première caméra...")
            camera = asi.Camera(0)

            # Obtenir les propriétés
            props = camera.get_camera_property()
            print(f"   Nom: {props.get('Name', 'N/A')}")
            print(f"   ID: {props.get('CameraID', 'N/A')}")
            print(f"   Résolution: {props.get('MaxWidth', 'N/A')}x{props.get('MaxHeight', 'N/A')}")

            # Test de configuration basique
            camera.set_roi(width=min(640, props.get('MaxWidth', 640)),
                          height=min(480, props.get('MaxHeight', 480)))
            camera.set_image_type(asi.ASI_IMG_RAW8)

            print("✅ Configuration basique réussie")

            # Fermer la connexion
            camera.close()
            print("✅ Connexion fermée proprement")

        except Exception as e:
            print(f"❌ Erreur lors du test de connexion: {e}")
            return False

    print("\n✅ Tous les tests Python ASI réussis!")
    return True

if __name__ == "__main__":
    success = test_asi_python()
    sys.exit(0 if success else 1)
EOF

chmod +x "$TEST_SCRIPT"
log_success "Script de test créé: $TEST_SCRIPT"

# 6. Test final
log_info "Test final de l'installation"

# Exécuter le script de test
if $PYTHON_CMD "$TEST_SCRIPT"; then
    log_success "Test Python réussi!"
else
    log_warning "Test Python échoué - vérifiez les erreurs ci-dessus"
fi

# Vérifier la détection USB
echo
log_info "Vérification de la détection USB"
if lsusb | grep -q "03c3:120d"; then
    log_success "Caméra ASI120MM-S détectée"
elif lsusb | grep -q "03c3"; then
    log_success "Caméra ASI détectée (autre modèle)"
else
    log_warning "Aucune caméra ASI détectée via USB"
fi

# Résumé final
echo
log_success "🎉 Installation du support Python ASI terminée!"
echo
echo "Résumé de l'installation:"
echo "- SDK ZWO ASI: $ASI_LIB_PATH"
echo "- Module Python zwoasi: installé"
echo "- Script de test: $TEST_SCRIPT"
echo
echo "Commandes utiles:"
echo "- Tester Python: python3 $TEST_SCRIPT"
echo "- Vérifier USB: lsusb | grep 03c3"
echo "- Importer en Python: python3 -c 'import zwoasi; print(\"OK\")'"
