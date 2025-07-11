#!/bin/bash
set -e

# Script de diagnostic pour les caméras QHY CCD
# Diagnostique les problèmes d'installation et de connexion

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Source des fonctions communes
if [ -f "$PROJECT_ROOT/scripts/core/airastro-common.sh" ]; then
    source "$PROJECT_ROOT/scripts/core/airastro-common.sh"
else
    log_info() { echo -e "\033[1;32m[QHY Diagnostic]\033[0m $*"; }
    log_error() { echo -e "\033[1;31m[Error]\033[0m $*" >&2; }
    log_warning() { echo -e "\033[1;33m[Warning]\033[0m $*"; }
fi

log_info "🔍 Diagnostic QHY CCD - $(date)"
echo "======================================"

# 1. Détection des caméras QHY
log_info "1. Détection des caméras QHY"
if command -v lsusb >/dev/null; then
    QHY_DEVICES=$(lsusb | grep "1618" || true)
    if [ -n "$QHY_DEVICES" ]; then
        log_info "✅ Caméra(s) QHY détectée(s):"
        echo "$QHY_DEVICES" | while read -r line; do
            log_info "   $line"
        done
    else
        log_warning "❌ Aucune caméra QHY détectée"
        log_info "Vérifiez que votre caméra est connectée et alimentée"
    fi
else
    log_error "lsusb non disponible"
fi

# 2. Vérification des drivers INDI
log_info ""
log_info "2. Vérification des drivers INDI QHY"
QHY_DRIVERS=$(find /usr -name "indi_qhy*" -type f -executable 2>/dev/null || true)
if [ -n "$QHY_DRIVERS" ]; then
    log_info "✅ Drivers INDI QHY trouvés:"
    echo "$QHY_DRIVERS" | while read -r driver; do
        log_info "   $(basename "$driver") - $(ls -la "$driver" | awk '{print $1, $3, $4}')"
    done
else
    log_warning "❌ Aucun driver INDI QHY trouvé"
    log_info "Installez avec: sudo apt-get install indi-qhy"
fi

# 3. Vérification des bibliothèques QHY
log_info ""
log_info "3. Vérification des bibliothèques QHY"
if command -v ldconfig >/dev/null; then
    QHY_LIBS=$(ldconfig -p | grep "libqhy" || true)
    if [ -n "$QHY_LIBS" ]; then
        log_info "✅ Bibliothèques QHY trouvées:"
        echo "$QHY_LIBS" | while read -r lib; do
            log_info "   $lib"
        done
    else
        log_warning "❌ Bibliothèques QHY non trouvées"
        log_info "Installez avec: sudo apt-get install libqhy"
    fi
else
    log_warning "ldconfig non disponible"
fi

# 4. Vérification des packages système
log_info ""
log_info "4. Vérification des packages système"
PACKAGES=("indi-qhy" "libqhy" "indi-bin" "libindi1")
for package in "${PACKAGES[@]}"; do
    if dpkg -l | grep -q "^ii.*$package "; then
        VERSION=$(dpkg -l | grep "^ii.*$package " | awk '{print $3}')
        log_info "✅ $package: $VERSION"
    else
        log_warning "❌ $package: Non installé"
    fi
done

# 5. Vérification des règles udev
log_info ""
log_info "5. Vérification des règles udev"
UDEV_RULES=("/etc/udev/rules.d/85-qhy.rules" "/lib/udev/rules.d/85-qhy.rules")
UDEV_FOUND=false
for rule_file in "${UDEV_RULES[@]}"; do
    if [ -f "$rule_file" ]; then
        log_info "✅ Règles udev trouvées: $rule_file"
        log_info "   Contenu:"
        cat "$rule_file" | while read -r line; do
            log_info "     $line"
        done
        UDEV_FOUND=true
    fi
done

if [ "$UDEV_FOUND" = false ]; then
    log_warning "❌ Aucune règle udev QHY trouvée"
    log_info "Créez les règles avec:"
    log_info "   sudo bash -c 'echo \"SUBSYSTEMS==\\\"usb\\\", ATTRS{idVendor}==\\\"1618\\\", GROUP=\\\"users\\\", MODE=\\\"0666\\\"\" > /etc/udev/rules.d/85-qhy.rules'"
    log_info "   sudo udevadm control --reload-rules"
    log_info "   sudo udevadm trigger"
fi

# 6. Vérification des permissions
log_info ""
log_info "6. Vérification des permissions"
if [ -n "$QHY_DEVICES" ]; then
    log_info "Vérification des permissions USB..."
    lsusb | grep "1618" | while read -r line; do
        BUS=$(echo "$line" | sed 's/Bus \([0-9]*\).*/\1/')
        DEVICE=$(echo "$line" | sed 's/.*Device \([0-9]*\).*/\1/')
        DEV_PATH="/dev/bus/usb/$BUS/$DEVICE"
        if [ -e "$DEV_PATH" ]; then
            PERMS=$(ls -la "$DEV_PATH" | awk '{print $1, $3, $4}')
            log_info "   $DEV_PATH: $PERMS"
        fi
    done
else
    log_info "Aucune caméra QHY connectée pour vérifier les permissions"
fi

# 7. Test de connexion INDI
log_info ""
log_info "7. Test de connexion INDI"
if [ -n "$QHY_DRIVERS" ] && [ -n "$QHY_DEVICES" ]; then
    log_info "Test de démarrage du driver INDI QHY..."
    
    # Tuer tout processus indiserver existant
    pkill -f "indiserver.*qhy" 2>/dev/null || true
    sleep 2
    
    # Test du driver principal
    QHY_MAIN_DRIVER=$(echo "$QHY_DRIVERS" | head -1)
    if [ -n "$QHY_MAIN_DRIVER" ]; then
        log_info "Test du driver: $(basename "$QHY_MAIN_DRIVER")"
        timeout 10 "$QHY_MAIN_DRIVER" --help 2>/dev/null || true
        
        # Test avec indiserver
        log_info "Test avec indiserver (5 secondes)..."
        timeout 5 indiserver -v "$(basename "$QHY_MAIN_DRIVER")" 2>/dev/null || true
    fi
else
    log_warning "Impossible de tester: drivers ou caméras manquants"
fi

# 8. Vérification Python
log_info ""
log_info "8. Vérification des modules Python"
if command -v python3 >/dev/null; then
    PYTHON_MODULES=("numpy" "astropy" "pyindi-client")
    for module in "${PYTHON_MODULES[@]}"; do
        if python3 -c "import $module" 2>/dev/null; then
            log_info "✅ Module Python $module: Disponible"
        else
            log_warning "❌ Module Python $module: Non disponible"
        fi
    done
    
    # Test spécifique QHY si disponible
    if python3 -c "import qhyccd" 2>/dev/null; then
        log_info "✅ Module Python qhyccd: Disponible"
    else
        log_info "ℹ️  Module Python qhyccd: Non disponible (optionnel)"
    fi
else
    log_warning "Python3 non disponible"
fi

# 9. Résumé et recommandations
log_info ""
log_info "9. Résumé et recommandations"
echo "======================================"

# Calculer le score de santé
SCORE=0
TOTAL=10

[ -n "$QHY_DEVICES" ] && SCORE=$((SCORE + 3))
[ -n "$QHY_DRIVERS" ] && SCORE=$((SCORE + 2))
[ -n "$QHY_LIBS" ] && SCORE=$((SCORE + 2))
[ "$UDEV_FOUND" = true ] && SCORE=$((SCORE + 1))
dpkg -l | grep -q "^ii.*indi-qhy " && SCORE=$((SCORE + 1))
command -v python3 >/dev/null && python3 -c "import pyindi" 2>/dev/null && SCORE=$((SCORE + 1))

log_info "Score de santé QHY: $SCORE/$TOTAL"

if [ "$SCORE" -ge 8 ]; then
    log_info "✅ Installation QHY en excellent état"
elif [ "$SCORE" -ge 6 ]; then
    log_info "⚠️  Installation QHY en bon état avec quelques améliorations possibles"
elif [ "$SCORE" -ge 4 ]; then
    log_warning "⚠️  Installation QHY partielle - action recommandée"
else
    log_error "❌ Installation QHY défaillante - action requise"
fi

# Recommandations spécifiques
if [ -z "$QHY_DEVICES" ]; then
    log_info "📋 Recommandations:"
    log_info "   - Vérifiez que votre caméra QHY est connectée"
    log_info "   - Vérifiez l'alimentation de la caméra"
    log_info "   - Testez avec un autre port USB"
fi

if [ -z "$QHY_DRIVERS" ]; then
    log_info "📋 Pour installer les drivers QHY:"
    log_info "   sudo apt-get update"
    log_info "   sudo apt-get install indi-qhy libqhy"
fi

if [ "$UDEV_FOUND" = false ]; then
    log_info "📋 Pour configurer les permissions USB:"
    log_info "   sudo bash -c 'echo \"SUBSYSTEMS==\\\"usb\\\", ATTRS{idVendor}==\\\"1618\\\", GROUP=\\\"users\\\", MODE=\\\"0666\\\"\" > /etc/udev/rules.d/85-qhy.rules'"
    log_info "   sudo udevadm control --reload-rules"
    log_info "   sudo udevadm trigger"
fi

log_info ""
log_info "🏁 Diagnostic QHY terminé - $(date)"
