#!/bin/bash
set -e

# Script de vérification post-installation
# Vérifie que tous les composants sont correctement installés

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Source des fonctions communes
source "$PROJECT_ROOT/scripts/core/airastro-common.sh"

log_info "🔍 Vérification post-installation AirAstro"
echo

# Variables de suivi
ISSUES_FOUND=0
EQUIPMENT_DETECTED=0
EQUIPMENT_CONFIGURED=0

# Fonction pour signaler un problème
report_issue() {
    local message="$1"
    local severity="${2:-WARNING}"

    if [ "$severity" = "ERROR" ]; then
        log_error "$message"
        ((ISSUES_FOUND++))
    else
        log_warning "$message"
    fi
}

# Fonction pour signaler un succès
report_success() {
    local message="$1"
    log_success "$message"
}

# 1. Vérification des services de base
log_info "=== Vérification des services de base ==="

# Service AirAstro
if systemctl is-active --quiet airastro 2>/dev/null; then
    report_success "Service AirAstro actif"
elif systemctl is-enabled --quiet airastro 2>/dev/null; then
    log_info "Service AirAstro configuré mais pas actif"
    sudo systemctl start airastro
    if systemctl is-active --quiet airastro; then
        report_success "Service AirAstro démarré"
    else
        report_issue "Service AirAstro ne peut pas démarrer" "ERROR"
    fi
else
    report_issue "Service AirAstro non configuré" "ERROR"
fi

# Service INDI
if command -v indiserver >/dev/null; then
    report_success "INDI server disponible"
    if systemctl is-active --quiet indiserver 2>/dev/null; then
        report_success "Service INDI actif"
    else
        log_info "Service INDI non actif (normal)"
    fi
else
    report_issue "INDI server non disponible" "ERROR"
fi

# Service hotspot
if systemctl is-enabled --quiet start-hotspot 2>/dev/null; then
    report_success "Service hotspot configuré"
else
    report_issue "Service hotspot non configuré"
fi

echo

# 2. Vérification des modules Python
log_info "=== Vérification des modules Python ==="

PYTHON_MODULES=(
    "numpy:NumPy (calculs scientifiques)"
    "astropy:AstroPy (astronomie)"
    "pyindi_client:PyINDI (client INDI)"
)

for module_info in "${PYTHON_MODULES[@]}"; do
    module_name=$(echo "$module_info" | cut -d: -f1)
    module_desc=$(echo "$module_info" | cut -d: -f2)

    if python3 -c "import $module_name" 2>/dev/null; then
        report_success "$module_desc installé"
    else
        report_issue "$module_desc non disponible"
    fi
done

echo

# 3. Détection automatique des équipements
log_info "=== Détection automatique des équipements ==="

# Caméras ASI
if lsusb | grep -q "03c3"; then
    ((EQUIPMENT_DETECTED++))
    report_success "Caméra(s) ZWO ASI détectée(s)"
    lsusb | grep "03c3" | sed 's/^/    /'

    # Vérifier le support ASI
    if python3 -c "import zwoasi" 2>/dev/null; then
        report_success "Support Python ASI installé"
        ((EQUIPMENT_CONFIGURED++))
    else
        report_issue "Support Python ASI manquant"
        log_info "Solution: $PROJECT_ROOT/scripts/brands/asi/install-asi-python.sh"
    fi

    if [ -f "/usr/bin/indi_asi_ccd" ]; then
        report_success "Driver INDI ASI installé"
    else
        report_issue "Driver INDI ASI manquant"
        log_info "Solution: sudo apt install indi-asi"
    fi
fi

# Caméras QHY
if lsusb | grep -q "1618"; then
    ((EQUIPMENT_DETECTED++))
    report_success "Caméra(s) QHY détectée(s)"
    lsusb | grep "1618" | sed 's/^/    /'

    if [ -f "/usr/bin/indi_qhy_ccd" ]; then
        report_success "Driver INDI QHY installé"
        ((EQUIPMENT_CONFIGURED++))
    else
        report_issue "Driver INDI QHY manquant"
        log_info "Solution: sudo apt install indi-qhy"
    fi
fi

# Caméras Canon
if lsusb | grep -q "04a9"; then
    ((EQUIPMENT_DETECTED++))
    report_success "Caméra(s) Canon détectée(s)"
    lsusb | grep "04a9" | sed 's/^/    /'

    if [ -f "/usr/bin/indi_canon_ccd" ]; then
        report_success "Driver INDI Canon installé"
        ((EQUIPMENT_CONFIGURED++))
    else
        report_issue "Driver INDI Canon manquant"
        log_info "Solution: sudo apt install indi-gphoto"
    fi
fi

# Caméras Nikon
if lsusb | grep -q "04b0"; then
    ((EQUIPMENT_DETECTED++))
    report_success "Caméra(s) Nikon détectée(s)"
    lsusb | grep "04b0" | sed 's/^/    /'

    if [ -f "/usr/bin/indi_nikon_ccd" ]; then
        report_success "Driver INDI Nikon installé"
        ((EQUIPMENT_CONFIGURED++))
    else
        report_issue "Driver INDI Nikon manquant"
        log_info "Solution: sudo apt install indi-gphoto"
    fi
fi

if [ "$EQUIPMENT_DETECTED" -eq 0 ]; then
    log_info "Aucun équipement astronomique détecté"
    log_info "Connectez vos équipements et relancez cette vérification"
fi

echo

# 4. Vérification de la connectivité réseau
log_info "=== Vérification de la connectivité réseau ==="

# Interface réseau
if ip route | grep -q "default"; then
    report_success "Connexion réseau disponible"
else
    report_issue "Pas de connexion réseau par défaut"
fi

# mDNS
if command -v avahi-daemon >/dev/null && systemctl is-active --quiet avahi-daemon; then
    report_success "Service mDNS actif"
else
    report_issue "Service mDNS non actif"
fi

# Test de résolution airastro.local
if ping -c 1 airastro.local >/dev/null 2>&1; then
    report_success "Résolution airastro.local fonctionnelle"
else
    report_issue "Résolution airastro.local échouée"
fi

echo

# 5. Vérification des accès
log_info "=== Vérification des accès ==="

# Port AirAstro
if netstat -tln 2>/dev/null | grep -q ":3000"; then
    report_success "Port AirAstro (3000) en écoute"
elif ss -tln 2>/dev/null | grep -q ":3000"; then
    report_success "Port AirAstro (3000) en écoute"
else
    report_issue "Port AirAstro (3000) non accessible"
fi

# Interface web
if [ -d "$PROJECT_ROOT/apps/web/dist" ]; then
    report_success "Interface web construite"
else
    report_issue "Interface web non construite"
fi

echo

# 6. Résumé final
log_info "=== Résumé de l'installation ==="
echo

echo "📊 Statistiques:"
echo "   - Problèmes détectés: $ISSUES_FOUND"
echo "   - Équipements détectés: $EQUIPMENT_DETECTED"
echo "   - Équipements configurés: $EQUIPMENT_CONFIGURED"
echo

if [ "$ISSUES_FOUND" -eq 0 ]; then
    log_success "🎉 Installation parfaite! Tous les composants sont opérationnels."
    echo
    echo "🚀 AirAstro est prêt à être utilisé:"
    echo "   - Interface web: http://airastro.local"
    echo "   - IP locale: http://$(hostname -I | awk '{print $1}')"
    echo "   - Point d'accès: http://10.42.0.1 (si configuré)"
    echo
elif [ "$ISSUES_FOUND" -le 2 ]; then
    log_warning "⚠️  Installation avec quelques problèmes mineurs."
    echo
    echo "🔧 Actions recommandées:"
    echo "   - Vérifiez les messages d'avertissement ci-dessus"
    echo "   - Connectez vos équipements si nécessaire"
    echo "   - Relancez cette vérification après corrections"
    echo
else
    log_error "❌ Installation avec des problèmes importants."
    echo
    echo "🆘 Actions requises:"
    echo "   - Corrigez les erreurs signalées ci-dessus"
    echo "   - Consultez les logs d'installation"
    echo "   - Contactez le support si nécessaire"
    echo
fi

# Scripts d'aide disponibles
log_info "🛠️  Scripts d'aide disponibles:"
echo "   - Diagnostic ASI: $PROJECT_ROOT/scripts/brands/asi/diagnose-asi.sh"
echo "   - Gestion équipements: $PROJECT_ROOT/scripts/equipment-manager.sh"
echo "   - Configuration mDNS: $PROJECT_ROOT/scripts/configure-mdns.sh"
echo "   - Cette vérification: $0"
echo

# Code de sortie
exit "$ISSUES_FOUND"
