#!/bin/bash
set -e

# Script d'installation pour les appareils photo Nikon DSLR via GPhoto2
# Installe les drivers INDI et les bibliothèques GPhoto2

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Source des fonctions communes
if [ -f "$PROJECT_ROOT/scripts/core/airastro-common.sh" ]; then
    source "$PROJECT_ROOT/scripts/core/airastro-common.sh"
else
    log_info() { echo -e "\033[1;32m[Nikon Install]\033[0m $*"; }
    log_error() { echo -e "\033[1;31m[Error]\033[0m $*" >&2; }
    log_warning() { echo -e "\033[1;33m[Warning]\033[0m $*"; }
fi

log_info "🚀 Installation du support Nikon DSLR"

# Vérifier les privilèges
if [ "$EUID" -eq 0 ]; then
    log_warning "Ce script ne doit pas être exécuté en tant que root"
    log_info "Utilisez: ./install-nikon.sh"
    exit 1
fi

# Vérifier que sudo est disponible
if ! command -v sudo >/dev/null 2>&1; then
    log_error "sudo n'est pas disponible"
    exit 1
fi

# 1. Diagnostic initial
log_info "1. Diagnostic initial - détection des appareils Nikon"
if lsusb | grep -q "04b0"; then
    log_info "✅ Appareil(s) Nikon détecté(s):"
    lsusb | grep "04b0" | while read -r line; do
        log_info "   $line"
    done
else
    log_warning "❌ Aucun appareil Nikon détecté"
    log_info "Vérifiez que votre appareil Nikon est connecté et allumé"
fi

# 2. Installation des drivers GPhoto2 et INDI (même que Canon)
log_info "2. Installation des drivers GPhoto2 et INDI"

# Mettre à jour les packages
sudo apt-get update -qq

# Installer les packages GPhoto2 et INDI
log_info "Installation des packages GPhoto2 et INDI..."
if sudo apt-get install -y gphoto2 libgphoto2-dev indi-gphoto indi-bin; then
    log_info "✅ Packages GPhoto2 et INDI installés avec succès"
else
    log_warning "⚠️  Échec de l'installation de certains packages"
    
    # Essayer d'installer les packages individuellement
    sudo apt-get install -y gphoto2 || true
    sudo apt-get install -y libgphoto2-dev || true
    sudo apt-get install -y indi-bin || true
    
    # Si indi-gphoto n'est pas disponible, essayer les alternatives
    if ! sudo apt-get install -y indi-gphoto; then
        log_warning "indi-gphoto non disponible, tentative d'installation alternative"
        sudo apt-get install -y indi-full || true
    fi
fi

# 3. Configuration des permissions USB
log_info "3. Configuration des permissions USB"
if [ -f "/lib/udev/rules.d/40-nikon.rules" ] || [ -f "/etc/udev/rules.d/40-nikon.rules" ]; then
    log_info "✅ Règles udev Nikon déjà présentes"
else
    log_info "Création des règles udev pour Nikon..."
    sudo bash -c 'cat > /etc/udev/rules.d/40-nikon.rules << EOF
# Nikon DSLR cameras
SUBSYSTEMS=="usb", ATTRS{idVendor}=="04b0", GROUP="users", MODE="0666"
# Alternative pour certains modèles Nikon
SUBSYSTEMS=="usb", ATTRS{idVendor}=="04b0", ATTRS{idProduct}=="*", GROUP="plugdev", MODE="0664"
EOF'
    
    # Recharger les règles udev
    sudo udevadm control --reload-rules
    sudo udevadm trigger
    
    log_info "✅ Règles udev Nikon configurées"
fi

# 4. Test de GPhoto2
log_info "4. Test de GPhoto2"
if command -v gphoto2 >/dev/null; then
    log_info "Test de détection avec GPhoto2..."
    if gphoto2 --auto-detect 2>/dev/null; then
        log_info "✅ GPhoto2 fonctionne correctement"
    else
        log_warning "GPhoto2 installé mais aucun appareil détecté"
    fi
else
    log_error "GPhoto2 n'est pas installé correctement"
fi

# 5. Installation des modules Python (identique à Canon)
log_info "5. Installation des modules Python"
if command -v python3 >/dev/null && command -v pip3 >/dev/null; then
    log_info "Installation des modules Python pour l'astronomie..."
    
    # Modules de base
    python3 -m pip install --user numpy astropy pyindi-client || true
    
    # Module spécifique GPhoto2 si disponible
    python3 -m pip install --user gphoto2 || true
    
    log_info "✅ Modules Python installés"
else
    log_warning "Python3/pip3 non disponible, modules Python non installés"
fi

# 6. Vérification finale
log_info "6. Vérification de l'installation"

# Vérifier les drivers INDI
if find /usr -name "indi_gphoto*" -type f -executable 2>/dev/null | head -1 | grep -q .; then
    log_info "✅ Drivers INDI GPhoto trouvés:"
    find /usr -name "indi_gphoto*" -type f -executable 2>/dev/null | while read -r driver; do
        log_info "   $(basename "$driver")"
    done
else
    log_warning "❌ Aucun driver INDI GPhoto trouvé"
fi

# Vérifier les bibliothèques GPhoto2
if ldconfig -p | grep -q "libgphoto2"; then
    log_info "✅ Bibliothèques GPhoto2 trouvées"
else
    log_warning "❌ Bibliothèques GPhoto2 non trouvées"
fi

# Test de connexion si un appareil est détecté
if lsusb | grep -q "04b0"; then
    log_info "7. Test de connexion Nikon"
    log_info "Pour tester votre appareil Nikon, utilisez:"
    log_info "   gphoto2 --auto-detect"
    log_info "   gphoto2 --summary"
    log_info "   # Ou avec INDI:"
    log_info "   indiserver -v indi_gphoto_ccd"
    log_info "   # Dans un autre terminal:"
    log_info "   indi_getprop -h localhost -p 7624"
else
    log_info "7. Connectez votre appareil Nikon pour effectuer un test"
fi

log_info "✅ Installation Nikon terminée"
log_info ""
log_info "📋 Résumé:"
log_info "   - GPhoto2: $(gphoto2 --version 2>/dev/null | head -1 || echo "Non installé")"
log_info "   - Drivers INDI GPhoto: $(find /usr -name "indi_gphoto*" -type f -executable 2>/dev/null | wc -l) trouvé(s)"
log_info "   - Bibliothèques GPhoto2: $(ldconfig -p | grep -c "libgphoto2" || echo "0") trouvée(s)"
log_info "   - Appareils Nikon détectés: $(lsusb | grep -c "04b0" || echo "0")"
log_info ""
log_info "ℹ️  Instructions importantes:"
log_info "   1. Allumez votre appareil Nikon"
log_info "   2. Connectez-le en mode PTP/MTP (pas en mode stockage de masse)"
log_info "   3. Assurez-vous que l'appareil n'est pas en mode veille"
log_info ""
log_info "Pour diagnostiquer les problèmes, utilisez:"
log_info "   $SCRIPT_DIR/diagnose-nikon.sh"
