#!/bin/bash
set -e

# Script d'installation pour les caméras QHY CCD
# Installe les drivers INDI et les bibliothèques QHY

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Source des fonctions communes
if [ -f "$PROJECT_ROOT/scripts/core/airastro-common.sh" ]; then
    source "$PROJECT_ROOT/scripts/core/airastro-common.sh"
else
    log_info() { echo -e "\033[1;32m[QHY Install]\033[0m $*"; }
    log_error() { echo -e "\033[1;31m[Error]\033[0m $*" >&2; }
    log_warning() { echo -e "\033[1;33m[Warning]\033[0m $*"; }
fi

log_info "🚀 Installation du support QHY CCD"

# Vérifier les privilèges
if [ "$EUID" -eq 0 ]; then
    log_warning "Ce script ne doit pas être exécuté en tant que root"
    log_info "Utilisez: ./install-qhy.sh"
    exit 1
fi

# Vérifier que sudo est disponible
if ! command -v sudo >/dev/null 2>&1; then
    log_error "sudo n'est pas disponible"
    exit 1
fi

# 1. Diagnostic initial
log_info "1. Diagnostic initial - détection des caméras QHY"
if lsusb | grep -q "1618"; then
    log_info "✅ Caméra(s) QHY détectée(s):"
    lsusb | grep "1618" | while read -r line; do
        log_info "   $line"
    done
else
    log_warning "❌ Aucune caméra QHY détectée"
    log_info "Vérifiez que votre caméra QHY est connectée"
fi

# 2. Installation des drivers INDI
log_info "2. Installation des drivers INDI QHY"

# Mettre à jour les packages
sudo apt-get update -qq

# Installer les packages QHY
log_info "Installation des packages QHY..."
if sudo apt-get install -y indi-qhy libqhy; then
    log_info "✅ Packages QHY installés avec succès"
else
    log_warning "⚠️  Échec de l'installation via apt, tentative alternative"

    # Fallback: installer INDI de base et tenter de compiler QHY
    sudo apt-get install -y indi-bin libindi1 libindi-dev

    log_info "Packages de base INDI installés, QHY peut nécessiter une installation manuelle"
fi

# 3. Installation des modules Python pour QHY
log_info "3. Installation des modules Python"
if command -v python3 >/dev/null && command -v pip3 >/dev/null; then
    log_info "Installation des modules Python pour l'astronomie..."

    # Modules de base
    python3 -m pip install --user numpy astropy pyindi-client || true

    # Module spécifique QHY si disponible
    python3 -m pip install --user qhyccd-sdk || true

    log_info "✅ Modules Python installés"
else
    log_warning "Python3/pip3 non disponible, modules Python non installés"
fi

# 4. Configuration des permissions USB
log_info "4. Configuration des permissions USB"
if [ -f "/lib/udev/rules.d/85-qhy.rules" ] || [ -f "/etc/udev/rules.d/85-qhy.rules" ]; then
    log_info "✅ Règles udev QHY déjà présentes"
else
    log_info "Création des règles udev pour QHY..."
    sudo bash -c 'cat > /etc/udev/rules.d/85-qhy.rules << EOF
# QHY CCD cameras
SUBSYSTEMS=="usb", ATTRS{idVendor}=="1618", GROUP="users", MODE="0666"
EOF'

    # Recharger les règles udev
    sudo udevadm control --reload-rules
    sudo udevadm trigger

    log_info "✅ Règles udev QHY configurées"
fi

# 5. Vérification finale
log_info "5. Vérification de l'installation"

# Vérifier les drivers INDI
if find /usr -name "indi_qhy*" -type f -executable 2>/dev/null | head -1 | grep -q .; then
    log_info "✅ Drivers INDI QHY trouvés:"
    find /usr -name "indi_qhy*" -type f -executable 2>/dev/null | while read -r driver; do
        log_info "   $(basename "$driver")"
    done
else
    log_warning "❌ Aucun driver INDI QHY trouvé"
fi

# Vérifier les bibliothèques
if ldconfig -p | grep -q "libqhy"; then
    log_info "✅ Bibliothèques QHY trouvées"
else
    log_warning "❌ Bibliothèques QHY non trouvées"
fi

# Test de connexion si une caméra est détectée
if lsusb | grep -q "1618"; then
    log_info "6. Test de connexion QHY"
    log_info "Pour tester votre caméra QHY, utilisez:"
    log_info "   indiserver -v indi_qhy_ccd"
    log_info "   # Dans un autre terminal:"
    log_info "   indi_getprop -h localhost -p 7624"
else
    log_info "6. Connectez votre caméra QHY pour effectuer un test"
fi

log_info "✅ Installation QHY terminée"
log_info ""
log_info "📋 Résumé:"
log_info "   - Drivers INDI QHY: $(find /usr -name "indi_qhy*" -type f -executable 2>/dev/null | wc -l) trouvé(s)"
log_info "   - Bibliothèques QHY: $(ldconfig -p | grep -c "libqhy" || echo "0") trouvée(s)"
log_info "   - Règles udev: Configurées"
log_info "   - Caméras détectées: $(lsusb | grep -c "1618" || echo "0")"
log_info ""
log_info "Pour diagnostiquer les problèmes, utilisez:"
log_info "   $SCRIPT_DIR/diagnose-qhy.sh"
