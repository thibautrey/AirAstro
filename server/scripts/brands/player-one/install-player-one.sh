#!/bin/bash
set -e

# Script d'installation pour les caméras Player One Astronomy
# ATTENTION: Cette marque a des conflits de packages connus

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Source des fonctions communes
if [ -f "$PROJECT_ROOT/scripts/core/airastro-common.sh" ]; then
    source "$PROJECT_ROOT/scripts/core/airastro-common.sh"
else
    log_info() { echo -e "\033[1;32m[Player One Install]\033[0m $*"; }
    log_error() { echo -e "\033[1;31m[Error]\033[0m $*" >&2; }
    log_warning() { echo -e "\033[1;33m[Warning]\033[0m $*"; }
fi

log_error "⚠️  ATTENTION: Installation Player One désactivée"
log_error "❌ Conflits de packages connus détectés"
echo ""
log_info "🚀 Player One Astronomy - Installation manuelle requise"

# Vérifier les privilèges
if [ "$EUID" -eq 0 ]; then
    log_warning "Ce script ne doit pas être exécuté en tant que root"
    log_info "Utilisez: ./install-player-one.sh"
    exit 1
fi

# 1. Diagnostic initial
log_info "1. Diagnostic initial - détection des caméras Player One"
if lsusb | grep -q "a0a0"; then
    log_info "✅ Caméra(s) Player One détectée(s):"
    lsusb | grep "a0a0" | while read -r line; do
        log_info "   $line"
    done
else
    log_warning "❌ Aucune caméra Player One détectée"
    log_info "Vérifiez que votre caméra Player One est connectée et alimentée"
fi

# 2. Vérification des conflits existants
log_info "2. Vérification des conflits de packages"
CONFLICT_DETECTED=false

if dpkg -l | grep -q "indi-playerone"; then
    log_warning "⚠️  Package indi-playerone détecté"
    CONFLICT_DETECTED=true
fi

if dpkg -l | grep -q "libplayerone"; then
    log_warning "⚠️  Package libplayerone détecté"
    CONFLICT_DETECTED=true
fi

if dpkg -l | grep -q "libplayeronecamera2"; then
    log_warning "⚠️  Package libplayeronecamera2 détecté"
    CONFLICT_DETECTED=true
fi

if [ "$CONFLICT_DETECTED" = true ]; then
    log_error "❌ Conflits de packages détectés!"
    log_error "Les packages Player One sont en conflit entre eux"
    log_error "Résolution nécessaire avant installation"
    echo ""
    log_info "🔧 Pour résoudre les conflits:"
    log_info "   sudo apt-get remove --purge indi-playerone libplayerone libplayeronecamera2"
    log_info "   sudo rm -f /lib/udev/rules.d/99-player_one_astronomy.rules"
    log_info "   sudo rm -f /etc/udev/rules.d/99-player_one_astronomy.rules"
    log_info "   sudo apt-get autoremove"
    log_info "   sudo apt-get autoclean"
    echo ""
    log_info "Ou utilisez le script de nettoyage:"
    log_info "   $PROJECT_ROOT/scripts/fix-package-conflicts.sh player-one"
    exit 1
fi

# 3. Installation manuelle recommandée
log_info "3. Installation manuelle recommandée"
echo ""
log_warning "⚠️  L'installation automatique Player One est désactivée"
log_warning "   Raison: Conflits de packages récurrents"
log_warning "   Action: Installation manuelle requise"
echo ""

log_info "📋 Instructions d'installation manuelle:"
log_info ""
log_info "1. Téléchargez les drivers depuis le site officiel:"
log_info "   https://player-one-astronomy.com/download"
log_info ""
log_info "2. Installation recommandée dans cet ordre:"
log_info "   a) SDK Player One (libplayeronecamera)"
log_info "   b) Driver INDI Player One"
log_info ""
log_info "3. Évitez les packages des dépôts Ubuntu/Debian qui sont en conflit"
log_info ""
log_info "4. Après installation manuelle, testez avec:"
log_info "   lsusb | grep a0a0"
log_info "   indiserver -v indi_playerone_ccd"
log_info ""

# 4. Installation des modules Python de base
log_info "4. Installation des modules Python de base"
if command -v python3 >/dev/null && command -v pip3 >/dev/null; then
    log_info "Installation des modules Python pour l'astronomie..."
    
    # Modules de base (sans Player One spécifique)
    python3 -m pip install --user numpy astropy pyindi-client || true
    
    log_info "✅ Modules Python de base installés"
else
    log_warning "Python3/pip3 non disponible, modules Python non installés"
fi

# 5. Configuration des permissions USB
log_info "5. Configuration des permissions USB"
if [ -f "/lib/udev/rules.d/99-player_one_astronomy.rules" ] || [ -f "/etc/udev/rules.d/99-player_one_astronomy.rules" ]; then
    log_warning "⚠️  Règles udev Player One détectées"
    log_warning "   Ces règles peuvent être en conflit"
    log_info "   Vérifiez qu'elles correspondent à votre installation"
else
    log_info "Création des règles udev pour Player One..."
    sudo bash -c 'cat > /etc/udev/rules.d/99-player_one_astronomy.rules << EOF
# Player One Astronomy cameras
SUBSYSTEMS=="usb", ATTRS{idVendor}=="a0a0", GROUP="users", MODE="0666"
EOF'
    
    # Recharger les règles udev
    sudo udevadm control --reload-rules
    sudo udevadm trigger
    
    log_info "✅ Règles udev Player One configurées"
fi

# 6. Vérification finale
log_info "6. Vérification de l'installation"

# Vérifier les drivers INDI (si installation manuelle réussie)
if find /usr -name "indi_playerone*" -type f -executable 2>/dev/null | head -1 | grep -q .; then
    log_info "✅ Drivers INDI Player One trouvés:"
    find /usr -name "indi_playerone*" -type f -executable 2>/dev/null | while read -r driver; do
        log_info "   $(basename "$driver")"
    done
else
    log_warning "❌ Aucun driver INDI Player One trouvé (installation manuelle requise)"
fi

# Vérifier les bibliothèques Player One
if ldconfig -p | grep -q "libplayerone"; then
    log_info "✅ Bibliothèques Player One trouvées"
else
    log_warning "❌ Bibliothèques Player One non trouvées (installation manuelle requise)"
fi

log_info ""
log_info "📋 Résumé Player One:"
log_info "   - Installation automatique: ❌ Désactivée (conflits)"
log_info "   - Installation manuelle: ✅ Recommandée"
log_info "   - Drivers INDI: $(find /usr -name "indi_playerone*" -type f -executable 2>/dev/null | wc -l) trouvé(s)"
log_info "   - Bibliothèques: $(ldconfig -p | grep -c "libplayerone" || echo "0") trouvée(s)"
log_info "   - Caméras détectées: $(lsusb | grep -c "a0a0" || echo "0")"
log_info ""
log_info "🌐 Ressources utiles:"
log_info "   - Site officiel: https://player-one-astronomy.com/"
log_info "   - Support: https://player-one-astronomy.com/support"
log_info "   - Documentation INDI: https://indilib.org/devices/cameras/player-one.html"
log_info ""
log_info "Pour diagnostiquer les problèmes, utilisez:"
log_info "   $SCRIPT_DIR/diagnose-player-one.sh"

log_warning "⚠️  Installation Player One terminée (mode manuel)"
