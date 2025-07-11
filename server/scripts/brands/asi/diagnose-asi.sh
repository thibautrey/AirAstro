#!/bin/bash
set -e

# Script de diagnostic pour les caméras ZWO ASI
# Détecte et diagnostique les problèmes de configuration

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Source des fonctions communes
source "$PROJECT_ROOT/scripts/core/airastro-common.sh"

log_info "🔍 Diagnostic des caméras ZWO ASI"
echo

# 1. Vérification des périphériques USB
log_info "=== Vérification des périphériques USB ==="
echo "Périphériques USB détectés:"
lsusb

echo
echo "Caméras ASI détectées:"
if lsusb | grep -q "03c3"; then
    lsusb | grep "03c3" | while read -r line; do
        echo "  ✅ $line"
    done
else
    echo "  ❌ Aucune caméra ASI détectée"
fi

# 2. Vérification des modules kernel
echo
log_info "=== Vérification des modules kernel ==="
echo "Modules USB chargés:"
lsmod | grep -E "(usb|uvc)" | head -10

# Vérifier uvcvideo spécifiquement
if lsmod | grep -q uvcvideo; then
    echo "  ✅ Module uvcvideo chargé"
else
    echo "  ❌ Module uvcvideo non chargé"
fi

# 3. Vérification des permissions
echo
log_info "=== Vérification des permissions ==="
CURRENT_USER=$(whoami)
echo "Utilisateur actuel: $CURRENT_USER"
echo "Groupes: $(groups)"

# Vérifier les groupes importants
for group in plugdev dialout; do
    if groups | grep -q "$group"; then
        echo "  ✅ Membre du groupe $group"
    else
        echo "  ❌ Pas membre du groupe $group"
    fi
done

# 4. Vérification des règles udev
echo
log_info "=== Vérification des règles udev ==="
UDEV_PATHS=(
    "/etc/udev/rules.d/99-asi.rules"
    "/etc/udev/rules.d/99-asi-cameras.rules"
    "/lib/udev/rules.d/99-asi.rules"
    "/usr/lib/udev/rules.d/99-asi.rules"
)

for path in "${UDEV_PATHS[@]}"; do
    if [ -f "$path" ]; then
        echo "  ✅ $path existe"
        echo "     Contenu:"
        cat "$path" | sed 's/^/       /'
    else
        echo "  ❌ $path n'existe pas"
    fi
done

# 5. Vérification du SDK ASI
echo
log_info "=== Vérification du SDK ASI ==="
LIB_PATHS=(
    "/usr/local/lib/libASICamera2.so"
    "/usr/lib/libASICamera2.so"
    "/usr/lib/aarch64-linux-gnu/libASICamera2.so"
    "/usr/lib/arm-linux-gnueabihf/libASICamera2.so"
    "/usr/lib/x86_64-linux-gnu/libASICamera2.so"
)

ASI_LIB_FOUND=false
for path in "${LIB_PATHS[@]}"; do
    if [ -f "$path" ]; then
        echo "  ✅ $path existe"
        ls -la "$path"
        ASI_LIB_FOUND=true
    else
        echo "  ❌ $path n'existe pas"
    fi
done

if [ "$ASI_LIB_FOUND" = false ]; then
    echo "  ❌ Aucune bibliothèque ASI trouvée"
else
    echo "  ✅ Au moins une bibliothèque ASI trouvée"
fi

# 6. Vérification des drivers INDI
echo
log_info "=== Vérification des drivers INDI ==="
INDI_DRIVERS=(
    "/usr/bin/indi_asi_ccd"
    "/usr/local/bin/indi_asi_ccd"
    "/usr/lib/indi/indi_asi_ccd"
    "/usr/local/lib/indi/indi_asi_ccd"
)

INDI_DRIVER_FOUND=false
for driver in "${INDI_DRIVERS[@]}"; do
    if [ -f "$driver" ] && [ -x "$driver" ]; then
        echo "  ✅ $driver existe et est exécutable"
        INDI_DRIVER_FOUND=true
    else
        echo "  ❌ $driver non trouvé ou non exécutable"
    fi
done

if [ "$INDI_DRIVER_FOUND" = false ]; then
    echo "  ❌ Aucun driver INDI ASI trouvé"
    echo "  💡 Exécutez: sudo apt install indi-asi"
fi

# 7. Vérification des modules Python
echo
log_info "=== Vérification des modules Python ==="
PYTHON_MODULES=(
    "zwoasi"
    "pyindi_client"
    "astropy"
    "numpy"
)

for module in "${PYTHON_MODULES[@]}"; do
    if python3 -c "import $module" 2>/dev/null; then
        echo "  ✅ Module $module disponible"
    else
        echo "  ❌ Module $module non disponible"
    fi
done

# 8. Messages kernel récents
echo
log_info "=== Messages kernel récents ==="
echo "Messages USB/ASI récents (dernières 50 lignes):"
if command -v dmesg >/dev/null 2>&1; then
    dmesg | grep -i -E "(usb|asi|03c3)" | tail -10 | sed 's/^/  /'
else
    echo "  ❌ dmesg non disponible"
fi

# 9. Test de détection des périphériques
echo
log_info "=== Test de détection des périphériques ==="
echo "Périphériques dans /dev:"
ls -la /dev/ | grep -E "(video|asi|usb)" | head -10 | sed 's/^/  /'

# 10. Création d'un script de test automatique
echo
log_info "=== Création d'un script de test ==="
TEST_SCRIPT="/tmp/test-asi-connection.py"
cat > "$TEST_SCRIPT" << 'EOF'
#!/usr/bin/env python3
"""
Test automatique de connexion aux caméras ZWO ASI
"""

import sys
import os

def test_asi_connection():
    print("🧪 Test de connexion ASI")
    print("=" * 40)

    # Test 1: Import zwoasi
    try:
        import zwoasi as asi
        print("✅ Module zwoasi importé")
    except ImportError as e:
        print(f"❌ Échec import zwoasi: {e}")
        return False

    # Test 2: Initialisation
    lib_paths = [
        "/usr/local/lib/libASICamera2.so",
        "/usr/lib/aarch64-linux-gnu/libASICamera2.so",
        "/usr/lib/arm-linux-gnueabihf/libASICamera2.so"
    ]

    lib_path = None
    for path in lib_paths:
        if os.path.exists(path):
            lib_path = path
            break

    if not lib_path:
        print("❌ Bibliothèque ASI non trouvée")
        return False

    print(f"📚 Utilisation: {lib_path}")

    try:
        asi.init(lib_path)
        print("✅ Bibliothèque initialisée")
    except Exception as e:
        print(f"❌ Échec initialisation: {e}")
        return False

    # Test 3: Détection des caméras
    try:
        cameras = asi.list_cameras()
        print(f"🎥 Caméras détectées: {len(cameras)}")

        for i, camera_info in enumerate(cameras):
            print(f"   Caméra {i}: {camera_info}")

        if cameras:
            # Test de connexion
            camera = asi.Camera(0)
            props = camera.get_camera_property()
            print(f"✅ Connexion réussie: {props.get('Name', 'N/A')}")
            camera.close()

        return True

    except Exception as e:
        print(f"❌ Erreur détection: {e}")
        return False

if __name__ == "__main__":
    success = test_asi_connection()
    print(f"\n{'✅ Test réussi' if success else '❌ Test échoué'}")
    sys.exit(0 if success else 1)
EOF

chmod +x "$TEST_SCRIPT"
echo "  ✅ Script de test créé: $TEST_SCRIPT"

# 11. Suggestions de résolution
echo
log_info "=== Suggestions de résolution ==="
echo "🔧 Étapes recommandées selon les problèmes détectés:"
echo

# Vérifier les problèmes courants
NEED_REBOOT=false
NEED_LOGOUT=false
NEED_QUICK_FIX=false

# Problème: pas de caméra détectée
if ! lsusb | grep -q "03c3"; then
    echo "📌 Caméra ASI non détectée:"
    echo "   1. Vérifiez que la caméra est connectée"
    echo "   2. Essayez un autre câble USB"
    echo "   3. Testez un autre port USB"
    echo "   4. Vérifiez l'alimentation de la caméra"
    echo
fi

# Problème: pas de driver INDI
if [ "$INDI_DRIVER_FOUND" = false ]; then
    echo "📌 Driver INDI manquant:"
    echo "   sudo apt update"
    echo "   sudo apt install indi-asi libasi"
    echo
    NEED_QUICK_FIX=true
fi

# Problème: pas de SDK
if [ "$ASI_LIB_FOUND" = false ]; then
    echo "📌 SDK ASI manquant:"
    echo "   $SCRIPT_DIR/install-asi-python.sh"
    echo
    NEED_QUICK_FIX=true
fi

# Problème: module Python manquant
if ! python3 -c "import zwoasi" 2>/dev/null; then
    echo "📌 Module Python zwoasi manquant:"
    echo "   pip3 install zwoasi"
    echo "   OU: $SCRIPT_DIR/install-asi-python.sh"
    echo
    NEED_QUICK_FIX=true
fi

# Problème: autres modules Python manquants
MISSING_MODULES=()
for module in "numpy" "astropy" "pyindi_client"; do
    if ! python3 -c "import $module" 2>/dev/null; then
        MISSING_MODULES+=("$module")
    fi
done

if [ ${#MISSING_MODULES[@]} -gt 0 ]; then
    echo "📌 Modules Python manquants:"
    echo "   pip3 install ${MISSING_MODULES[*]}"
    echo
    NEED_QUICK_FIX=true
fi

# Problème: permissions
if ! groups | grep -q plugdev; then
    echo "📌 Permissions manquantes:"
    echo "   sudo usermod -a -G plugdev \$USER"
    echo "   (puis se reconnecter)"
    echo
    NEED_LOGOUT=true
fi

# Règles udev manquantes
UDEV_FOUND=false
for path in "${UDEV_PATHS[@]}"; do
    if [ -f "$path" ]; then
        UDEV_FOUND=true
        break
    fi
done

if [ "$UDEV_FOUND" = false ]; then
    echo "📌 Règles udev manquantes:"
    echo "   sudo tee /etc/udev/rules.d/99-asi-cameras.rules > /dev/null << 'EOF'"
    echo "   SUBSYSTEM==\"usb\", ATTRS{idVendor}==\"03c3\", MODE=\"0666\", GROUP=\"plugdev\""
    echo "   EOF"
    echo "   sudo udevadm control --reload-rules"
    echo "   sudo udevadm trigger"
    echo
    NEED_REBOOT=true
fi

# Correction automatique proposée
if [ "$NEED_QUICK_FIX" = true ]; then
    echo "🚀 CORRECTION AUTOMATIQUE DISPONIBLE:"
    echo "   $PROJECT_ROOT/scripts/installation/quick-fix.sh"
    echo
    echo "   Ce script corrigera automatiquement:"
    echo "   - Installation des modules Python manquants"
    echo "   - Installation des drivers INDI"
    echo "   - Configuration des services"
    echo
fi

# Messages finaux
if [ "$NEED_REBOOT" = true ]; then
    echo "🔄 Un redémarrage est recommandé après les corrections"
fi

if [ "$NEED_LOGOUT" = true ]; then
    echo "🔄 Une reconnexion est nécessaire pour les changements de groupe"
fi

echo
echo "🧪 Pour tester après les corrections:"
echo "   python3 $TEST_SCRIPT"
echo
echo "📋 Commandes utiles:"
echo "   lsusb | grep 03c3           # Vérifier détection USB"
echo "   groups                      # Vérifier les groupes"
echo "   dmesg | grep -i asi         # Messages kernel"
echo "   python3 -c 'import zwoasi'  # Test module Python"
