#!/bin/bash
set -e

# Script d'installation pour les caméras ZWO ASI
# Installe les drivers INDI et les modules Python nécessaires

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

log() { echo -e "\033[1;32m[ZWO ASI Install]\033[0m $*"; }
error() { echo -e "\033[1;31m[Error]\033[0m $*" >&2; }
warn() { echo -e "\033[1;33m[Warning]\033[0m $*"; }

# Vérifier les privilèges
if [ "$EUID" -eq 0 ]; then
    error "Ce script ne doit pas être exécuté en tant que root"
    exit 1
fi

if ! command -v sudo >/dev/null 2>&1; then
    error "sudo n'est pas disponible"
    exit 1
fi

log "Installation des drivers ZWO ASI..."

# 1. Diagnostic initial
log "1. Diagnostic des caméras ASI connectées"
if lsusb | grep -q "03c3"; then
    log "✅ Caméras ZWO ASI détectées:"
    lsusb | grep "03c3" | while read -r line; do
        log "   - $line"
    done
else
    warn "Aucune caméra ZWO ASI détectée. L'installation continuera pour une utilisation future."
fi

# 2. Installation des drivers INDI
log "2. Installation des drivers INDI ASI"
sudo apt-get update -qq
if sudo apt-get install -y indi-asi libasi indi-bin; then
    log "✅ Drivers INDI ASI installés avec succès"
else
    error "❌ Échec de l'installation des drivers INDI ASI"
    exit 1
fi

# 3. Installation des modules Python
log "3. Installation des modules Python pour ASI"
if command -v python3 >/dev/null && command -v pip3 >/dev/null; then
    # Modules Python essentiels pour ASI
    PYTHON_MODULES=(
        "zwoasi"
        "numpy"
        "astropy"
        "pyindi-client"
    )
    
    for module in "${PYTHON_MODULES[@]}"; do
        if python3 -c "import $module" 2>/dev/null; then
            log "✅ Module $module déjà installé"
        else
            log "Installation du module $module..."
            if python3 -m pip install --user "$module"; then
                log "✅ Module $module installé avec succès"
            else
                warn "⚠️  Échec de l'installation du module $module"
            fi
        fi
    done
else
    warn "Python3 ou pip3 non disponible, modules Python non installés"
fi

# 4. Configuration des règles udev
log "4. Configuration des règles udev"
UDEV_RULES_FILE="/etc/udev/rules.d/99-zwo-asi.rules"
if [ ! -f "$UDEV_RULES_FILE" ]; then
    log "Création des règles udev pour ZWO ASI..."
    sudo tee "$UDEV_RULES_FILE" > /dev/null << 'EOF'
# ZWO ASI Camera rules
SUBSYSTEM=="usb", ATTRS{idVendor}=="03c3", MODE="0666", GROUP="plugdev"
EOF
    sudo udevadm control --reload-rules
    sudo udevadm trigger
    log "✅ Règles udev configurées"
else
    log "✅ Règles udev déjà configurées"
fi

# 5. Test de l'installation
log "5. Test de l'installation"
if command -v indi_asi_ccd >/dev/null; then
    log "✅ Driver INDI ASI disponible: $(which indi_asi_ccd)"
else
    warn "⚠️  Driver INDI ASI non trouvé dans le PATH"
fi

# Test des modules Python
if command -v python3 >/dev/null; then
    if python3 -c "import zwoasi; print('ZWO ASI Python module OK')" 2>/dev/null; then
        log "✅ Module Python ZWO ASI disponible"
    else
        warn "⚠️  Module Python ZWO ASI non disponible"
    fi
fi

# 6. Diagnostic final
log "6. Diagnostic final"
if [ -f "$SCRIPT_DIR/diagnose-asi.sh" ]; then
    "$SCRIPT_DIR/diagnose-asi.sh"
else
    # Diagnostic simple
    log "Résumé de l'installation:"
    echo "  - Drivers INDI: $(command -v indi_asi_ccd >/dev/null && echo "✅ OK" || echo "❌ Manquant")"
    echo "  - Module Python: $(python3 -c "import zwoasi" 2>/dev/null && echo "✅ OK" || echo "❌ Manquant")"
    echo "  - Règles udev: $([ -f "$UDEV_RULES_FILE" ] && echo "✅ OK" || echo "❌ Manquant")"
fi

log "✅ Installation ZWO ASI terminée avec succès"
log "Les caméras ZWO ASI devraient maintenant être utilisables avec INDI"
