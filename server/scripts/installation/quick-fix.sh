#!/bin/bash
set -e

# Script de correction rapide post-installation
# Corrige automatiquement les problèmes courants détectés

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Source des fonctions communes
source "$PROJECT_ROOT/scripts/core/airastro-common.sh"

log_info "🔧 Correction rapide des problèmes post-installation"
echo

# 1. Installer les modules Python manquants
log_info "=== Installation des modules Python essentiels ==="

PYTHON_MODULES=(
    "numpy"
    "astropy"
    "pyindi-client"
)

for module in "${PYTHON_MODULES[@]}"; do
    if python3 -c "import $module" 2>/dev/null; then
        log_success "Module $module déjà installé"
    else
        log_info "Installation du module $module"
        if python3 -m pip install --user "$module"; then
            log_success "Module $module installé avec succès"
        else
            log_warning "Installation utilisateur échouée, tentative système"
            if sudo python3 -m pip install "$module"; then
                log_success "Module $module installé (système)"
            else
                log_error "Impossible d'installer $module"
            fi
        fi
    fi
done

echo

# 2. Corriger les équipements détectés
log_info "=== Correction automatique des équipements ==="

# Caméras ASI
if lsusb | grep -q "03c3"; then
    log_info "Caméra(s) ZWO ASI détectée(s)"
    
    # Installer le module Python zwoasi
    if ! python3 -c "import zwoasi" 2>/dev/null; then
        log_info "Installation du module zwoasi"
        if [ -f "$PROJECT_ROOT/scripts/brands/asi/install-asi-python.sh" ]; then
            "$PROJECT_ROOT/scripts/brands/asi/install-asi-python.sh"
        else
            if python3 -m pip install --user zwoasi; then
                log_success "Module zwoasi installé"
            else
                log_error "Échec installation zwoasi"
            fi
        fi
    fi
    
    # Installer le driver INDI
    if ! [ -f "/usr/bin/indi_asi_ccd" ]; then
        log_info "Installation du driver INDI ASI"
        sudo apt-get update -qq
        sudo apt-get install -y indi-asi libasi
    fi
fi

# Caméras QHY
if lsusb | grep -q "1618"; then
    log_info "Caméra(s) QHY détectée(s)"
    
    if ! [ -f "/usr/bin/indi_qhy_ccd" ]; then
        log_info "Installation du driver INDI QHY"
        sudo apt-get update -qq
        sudo apt-get install -y indi-qhy
    fi
fi

# Caméras Canon/Nikon
if lsusb | grep -q -E "(04a9|04b0)"; then
    log_info "Caméra(s) Canon/Nikon détectée(s)"
    
    if ! [ -f "/usr/bin/indi_canon_ccd" ] && ! [ -f "/usr/bin/indi_nikon_ccd" ]; then
        log_info "Installation du driver INDI GPhoto"
        sudo apt-get update -qq
        sudo apt-get install -y indi-gphoto
    fi
fi

echo

# 3. Vérifier et corriger les services
log_info "=== Vérification et correction des services ==="

# Service AirAstro
if ! systemctl is-active --quiet airastro 2>/dev/null; then
    log_info "Démarrage du service AirAstro"
    sudo systemctl start airastro
    if systemctl is-active --quiet airastro; then
        log_success "Service AirAstro démarré"
    else
        log_error "Impossible de démarrer AirAstro"
    fi
fi

# Service mDNS
if ! systemctl is-active --quiet avahi-daemon 2>/dev/null; then
    log_info "Démarrage du service mDNS"
    sudo systemctl start avahi-daemon
    if systemctl is-active --quiet avahi-daemon; then
        log_success "Service mDNS démarré"
    else
        log_error "Impossible de démarrer mDNS"
    fi
fi

echo

# 4. Nettoyer et redémarrer les services
log_info "=== Nettoyage et redémarrage des services ==="

# Redémarrer AirAstro pour prendre en compte les nouveaux modules
if systemctl is-active --quiet airastro; then
    log_info "Redémarrage du service AirAstro"
    sudo systemctl restart airastro
    sleep 2
    if systemctl is-active --quiet airastro; then
        log_success "Service AirAstro redémarré"
    else
        log_error "Problème lors du redémarrage AirAstro"
    fi
fi

# Forcer la mise à jour des règles udev
log_info "Mise à jour des règles udev"
sudo udevadm control --reload-rules
sudo udevadm trigger

echo

# 5. Vérification finale
log_info "=== Vérification finale ==="

# Lancer la vérification post-installation
if [ -f "$PROJECT_ROOT/scripts/installation/post-install-check.sh" ]; then
    log_info "Exécution de la vérification finale"
    "$PROJECT_ROOT/scripts/installation/post-install-check.sh"
else
    log_warning "Script de vérification non trouvé"
fi

echo
log_success "🎉 Correction rapide terminée!"
echo
echo "🔄 Si des problèmes persistent:"
echo "   - Redémarrez le système: sudo reboot"
echo "   - Vérifiez les logs: journalctl -u airastro"
echo "   - Relancez la vérification: $PROJECT_ROOT/scripts/installation/post-install-check.sh"
echo
echo "📞 Support:"
echo "   - Diagnostic ASI: $PROJECT_ROOT/scripts/brands/asi/diagnose-asi.sh"
echo "   - Gestion équipements: $PROJECT_ROOT/scripts/equipment-manager.sh"
