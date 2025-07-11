#!/bin/bash
set -e

# Script de diagnostic pour les appareils photo Canon DSLR
# Diagnostique les problèmes d'installation et de connexion

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Source des fonctions communes
if [ -f "$PROJECT_ROOT/scripts/core/airastro-common.sh" ]; then
    source "$PROJECT_ROOT/scripts/core/airastro-common.sh"
else
    log_info() { echo -e "\033[1;32m[Canon Diagnostic]\033[0m $*"; }
    log_error() { echo -e "\033[1;31m[Error]\033[0m $*" >&2; }
    log_warning() { echo -e "\033[1;33m[Warning]\033[0m $*"; }
fi

log_info "🔍 Diagnostic Canon DSLR - $(date)"
echo "======================================"

# 1. Détection des appareils Canon
log_info "1. Détection des appareils Canon"
if command -v lsusb >/dev/null; then
    CANON_DEVICES=$(lsusb | grep "04a9" || true)
    if [ -n "$CANON_DEVICES" ]; then
        log_info "✅ Appareil(s) Canon détecté(s):"
        echo "$CANON_DEVICES" | while read -r line; do
            log_info "   $line"
        done
    else
        log_warning "❌ Aucun appareil Canon détecté"
        log_info "Vérifiez que votre appareil est connecté, allumé et en mode PTP/MTP"
    fi
else
    log_error "lsusb non disponible"
fi

# 2. Vérification de GPhoto2
log_info ""
log_info "2. Vérification de GPhoto2"
if command -v gphoto2 >/dev/null; then
    GPHOTO_VERSION=$(gphoto2 --version 2>/dev/null | head -1 || echo "Version inconnue")
    log_info "✅ GPhoto2 installé: $GPHOTO_VERSION"
    
    # Test de détection automatique
    log_info "Test de détection automatique..."
    GPHOTO_DETECT=$(gphoto2 --auto-detect 2>/dev/null || true)
    if [ -n "$GPHOTO_DETECT" ]; then
        log_info "✅ GPhoto2 détecte des appareils:"
        echo "$GPHOTO_DETECT" | while read -r line; do
            log_info "   $line"
        done
    else
        log_warning "❌ GPhoto2 ne détecte aucun appareil"
    fi
else
    log_error "❌ GPhoto2 non installé"
    log_info "Installez avec: sudo apt-get install gphoto2"
fi

# 3. Vérification des drivers INDI
log_info ""
log_info "3. Vérification des drivers INDI GPhoto"
GPHOTO_DRIVERS=$(find /usr -name "indi_gphoto*" -type f -executable 2>/dev/null || true)
if [ -n "$GPHOTO_DRIVERS" ]; then
    log_info "✅ Drivers INDI GPhoto trouvés:"
    echo "$GPHOTO_DRIVERS" | while read -r driver; do
        log_info "   $(basename "$driver") - $(ls -la "$driver" | awk '{print $1, $3, $4}')"
    done
else
    log_warning "❌ Aucun driver INDI GPhoto trouvé"
    log_info "Installez avec: sudo apt-get install indi-gphoto"
fi

# 4. Vérification des bibliothèques GPhoto2
log_info ""
log_info "4. Vérification des bibliothèques GPhoto2"
if command -v ldconfig >/dev/null; then
    GPHOTO_LIBS=$(ldconfig -p | grep "libgphoto2" || true)
    if [ -n "$GPHOTO_LIBS" ]; then
        log_info "✅ Bibliothèques GPhoto2 trouvées:"
        echo "$GPHOTO_LIBS" | while read -r lib; do
            log_info "   $lib"
        done
    else
        log_warning "❌ Bibliothèques GPhoto2 non trouvées"
        log_info "Installez avec: sudo apt-get install libgphoto2-dev"
    fi
else
    log_warning "ldconfig non disponible"
fi

# 5. Vérification des packages système
log_info ""
log_info "5. Vérification des packages système"
PACKAGES=("gphoto2" "libgphoto2-dev" "indi-gphoto" "indi-bin" "libindi1")
for package in "${PACKAGES[@]}"; do
    if dpkg -l | grep -q "^ii.*$package "; then
        VERSION=$(dpkg -l | grep "^ii.*$package " | awk '{print $3}')
        log_info "✅ $package: $VERSION"
    else
        log_warning "❌ $package: Non installé"
    fi
done

# 6. Vérification des règles udev
log_info ""
log_info "6. Vérification des règles udev"
UDEV_RULES=("/etc/udev/rules.d/40-gphoto.rules" "/lib/udev/rules.d/40-gphoto.rules")
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
    log_warning "❌ Aucune règle udev GPhoto trouvée"
    log_info "Créez les règles avec:"
    log_info "   sudo bash -c 'echo \"SUBSYSTEMS==\\\"usb\\\", ATTRS{idVendor}==\\\"04a9\\\", GROUP=\\\"users\\\", MODE=\\\"0666\\\"\" > /etc/udev/rules.d/40-gphoto.rules'"
    log_info "   sudo udevadm control --reload-rules"
    log_info "   sudo udevadm trigger"
fi

# 7. Vérification des permissions
log_info ""
log_info "7. Vérification des permissions"
if [ -n "$CANON_DEVICES" ]; then
    log_info "Vérification des permissions USB..."
    lsusb | grep "04a9" | while read -r line; do
        BUS=$(echo "$line" | sed 's/Bus \([0-9]*\).*/\1/')
        DEVICE=$(echo "$line" | sed 's/.*Device \([0-9]*\).*/\1/')
        DEV_PATH="/dev/bus/usb/$BUS/$DEVICE"
        if [ -e "$DEV_PATH" ]; then
            PERMS=$(ls -la "$DEV_PATH" | awk '{print $1, $3, $4}')
            log_info "   $DEV_PATH: $PERMS"
        fi
    done
else
    log_info "Aucun appareil Canon connecté pour vérifier les permissions"
fi

# 8. Test de connexion détaillé
log_info ""
log_info "8. Test de connexion détaillé"
if command -v gphoto2 >/dev/null && [ -n "$CANON_DEVICES" ]; then
    log_info "Test des fonctionnalités GPhoto2..."
    
    # Test des capacités
    log_info "Test des capacités de l'appareil..."
    timeout 10 gphoto2 --abilities 2>/dev/null | head -20 || log_warning "Timeout ou erreur lors du test des capacités"
    
    # Test du résumé
    log_info "Test du résumé de l'appareil..."
    timeout 10 gphoto2 --summary 2>/dev/null | head -20 || log_warning "Timeout ou erreur lors du test du résumé"
    
    # Test de la configuration
    log_info "Test de la configuration..."
    timeout 10 gphoto2 --get-config /main/actions/viewfinder 2>/dev/null || log_warning "Timeout ou erreur lors du test de configuration"
    
else
    log_warning "Impossible de tester: GPhoto2 ou appareils Canon manquants"
fi

# 9. Test INDI
log_info ""
log_info "9. Test de connexion INDI"
if [ -n "$GPHOTO_DRIVERS" ] && [ -n "$CANON_DEVICES" ]; then
    log_info "Test de démarrage du driver INDI GPhoto..."
    
    # Tuer tout processus indiserver existant
    pkill -f "indiserver.*gphoto" 2>/dev/null || true
    sleep 2
    
    # Test du driver principal
    GPHOTO_MAIN_DRIVER=$(echo "$GPHOTO_DRIVERS" | head -1)
    if [ -n "$GPHOTO_MAIN_DRIVER" ]; then
        log_info "Test du driver: $(basename "$GPHOTO_MAIN_DRIVER")"
        timeout 10 "$GPHOTO_MAIN_DRIVER" --help 2>/dev/null || true
        
        # Test avec indiserver
        log_info "Test avec indiserver (5 secondes)..."
        timeout 5 indiserver -v "$(basename "$GPHOTO_MAIN_DRIVER")" 2>/dev/null || true
    fi
else
    log_warning "Impossible de tester INDI: drivers ou appareils manquants"
fi

# 10. Vérification Python
log_info ""
log_info "10. Vérification des modules Python"
if command -v python3 >/dev/null; then
    PYTHON_MODULES=("numpy" "astropy" "pyindi-client")
    for module in "${PYTHON_MODULES[@]}"; do
        if python3 -c "import $module" 2>/dev/null; then
            log_info "✅ Module Python $module: Disponible"
        else
            log_warning "❌ Module Python $module: Non disponible"
        fi
    done
    
    # Test spécifique GPhoto2 si disponible
    if python3 -c "import gphoto2" 2>/dev/null; then
        log_info "✅ Module Python gphoto2: Disponible"
    else
        log_info "ℹ️  Module Python gphoto2: Non disponible (optionnel)"
    fi
else
    log_warning "Python3 non disponible"
fi

# 11. Résumé et recommandations
log_info ""
log_info "11. Résumé et recommandations"
echo "======================================"

# Calculer le score de santé
SCORE=0
TOTAL=10

[ -n "$CANON_DEVICES" ] && SCORE=$((SCORE + 3))
command -v gphoto2 >/dev/null && SCORE=$((SCORE + 2))
[ -n "$GPHOTO_DRIVERS" ] && SCORE=$((SCORE + 2))
[ -n "$GPHOTO_LIBS" ] && SCORE=$((SCORE + 1))
[ "$UDEV_FOUND" = true ] && SCORE=$((SCORE + 1))
[ -n "$GPHOTO_DETECT" ] && SCORE=$((SCORE + 1))

log_info "Score de santé Canon: $SCORE/$TOTAL"

if [ "$SCORE" -ge 8 ]; then
    log_info "✅ Installation Canon en excellent état"
elif [ "$SCORE" -ge 6 ]; then
    log_info "⚠️  Installation Canon en bon état avec quelques améliorations possibles"
elif [ "$SCORE" -ge 4 ]; then
    log_warning "⚠️  Installation Canon partielle - action recommandée"
else
    log_error "❌ Installation Canon défaillante - action requise"
fi

# Recommandations spécifiques
if [ -z "$CANON_DEVICES" ]; then
    log_info "📋 Recommandations pour la connexion:"
    log_info "   - Vérifiez que votre appareil Canon est connecté via USB"
    log_info "   - Allumez votre appareil Canon"
    log_info "   - Configurez l'appareil en mode PTP/MTP (pas en mode stockage)"
    log_info "   - Désactivez le mode veille automatique"
    log_info "   - Testez avec un autre câble USB"
fi

if ! command -v gphoto2 >/dev/null; then
    log_info "📋 Pour installer GPhoto2:"
    log_info "   sudo apt-get update"
    log_info "   sudo apt-get install gphoto2 libgphoto2-dev"
fi

if [ -z "$GPHOTO_DRIVERS" ]; then
    log_info "📋 Pour installer les drivers INDI GPhoto:"
    log_info "   sudo apt-get install indi-gphoto"
fi

if [ "$UDEV_FOUND" = false ]; then
    log_info "📋 Pour configurer les permissions USB:"
    log_info "   sudo bash -c 'echo \"SUBSYSTEMS==\\\"usb\\\", ATTRS{idVendor}==\\\"04a9\\\", GROUP=\\\"users\\\", MODE=\\\"0666\\\"\" > /etc/udev/rules.d/40-gphoto.rules'"
    log_info "   sudo udevadm control --reload-rules"
    log_info "   sudo udevadm trigger"
fi

log_info ""
log_info "🏁 Diagnostic Canon terminé - $(date)"
