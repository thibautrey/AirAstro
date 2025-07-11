#!/bin/bash

# Script de diagnostic du système INDI
# Vérifie l'état des dépôts, clés GPG, et packages INDI

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Fonction pour afficher une ligne de séparation
separator() {
    echo -e "${BLUE}$(printf '=%.0s' {1..60})${NC}"
}

# Diagnostic du système
check_system_info() {
    separator
    log_info "📋 INFORMATIONS SYSTÈME"
    separator
    
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        echo "OS: $PRETTY_NAME"
        echo "Version: $VERSION"
        echo "Codename: $VERSION_CODENAME"
        echo "ID: $ID"
    fi
    
    echo "Architecture: $(uname -m)"
    echo "Kernel: $(uname -r)"
    echo "Utilisateur: $(whoami)"
    echo "Groupes: $(groups)"
}

# Vérifier les dépôts
check_repositories() {
    separator
    log_info "📦 VÉRIFICATION DES DÉPÔTS"
    separator
    
    # Vérifier si le dépôt INDI existe
    if [[ -f /etc/apt/sources.list.d/indi.list ]]; then
        log_success "✅ Fichier de dépôt INDI trouvé"
        echo "Contenu:"
        cat /etc/apt/sources.list.d/indi.list | sed 's/^/  /'
    else
        log_warning "❌ Fichier de dépôt INDI non trouvé"
    fi
    
    # Vérifier les clés GPG
    echo ""
    log_info "🔑 Vérification des clés GPG"
    
    if [[ -f /etc/apt/keyrings/indilib.gpg ]]; then
        log_success "✅ Clé GPG INDI moderne trouvée"
        echo "Localisation: /etc/apt/keyrings/indilib.gpg"
    else
        log_warning "❌ Clé GPG INDI moderne non trouvée"
    fi
    
    # Vérifier les anciennes clés apt-key
    if sudo apt-key list 2>/dev/null | grep -q "indilib\|568A4C4F"; then
        log_warning "⚠️ Anciennes clés apt-key détectées (à supprimer)"
    else
        log_success "✅ Pas d'anciennes clés apt-key"
    fi
}

# Vérifier les packages INDI
check_indi_packages() {
    separator
    log_info "📦 VÉRIFICATION DES PACKAGES INDI"
    separator
    
    # Mettre à jour la liste des packages
    log_info "Mise à jour de la liste des packages..."
    if sudo apt-get update > /dev/null 2>&1; then
        log_success "✅ Mise à jour réussie"
    else
        log_error "❌ Échec de la mise à jour"
        return 1
    fi
    
    # Vérifier les packages INDI disponibles
    local available_packages
    available_packages=$(apt-cache search "^indi-" 2>/dev/null | wc -l)
    
    if [[ $available_packages -gt 0 ]]; then
        log_success "✅ $available_packages packages INDI disponibles"
    else
        log_error "❌ Aucun package INDI disponible"
        return 1
    fi
    
    # Vérifier les packages INDI installés
    local installed_packages
    installed_packages=$(dpkg -l | grep "^ii.*indi-" | wc -l)
    
    if [[ $installed_packages -gt 0 ]]; then
        log_success "✅ $installed_packages packages INDI installés"
        echo "Packages installés:"
        dpkg -l | grep "^ii.*indi-" | awk '{print "  " $2}' | head -10
        if [[ $installed_packages -gt 10 ]]; then
            echo "  ... et $(($installed_packages - 10)) autres"
        fi
    else
        log_warning "❌ Aucun package INDI installé"
    fi
}

# Vérifier les permissions USB
check_usb_permissions() {
    separator
    log_info "🔌 VÉRIFICATION DES PERMISSIONS USB"
    separator
    
    # Vérifier le groupe indi
    if getent group indi > /dev/null 2>&1; then
        log_success "✅ Groupe 'indi' existe"
        echo "Membres du groupe indi:"
        getent group indi | cut -d: -f4 | tr ',' '\n' | sed 's/^/  /'
    else
        log_warning "❌ Groupe 'indi' n'existe pas"
    fi
    
    # Vérifier les règles udev
    if [[ -f /etc/udev/rules.d/99-astro-devices.rules ]]; then
        log_success "✅ Règles udev pour appareils astro trouvées"
    else
        log_warning "❌ Règles udev pour appareils astro non trouvées"
    fi
    
    # Vérifier si l'utilisateur actuel est dans le groupe indi
    if groups | grep -q "indi"; then
        log_success "✅ Utilisateur actuel dans le groupe indi"
    else
        log_warning "❌ Utilisateur actuel pas dans le groupe indi"
    fi
}

# Vérifier les services
check_services() {
    separator
    log_info "🔧 VÉRIFICATION DES SERVICES"
    separator
    
    # Vérifier le service INDI
    if systemctl list-unit-files | grep -q "indi.service"; then
        log_success "✅ Service INDI configuré"
        local status=$(systemctl is-enabled indi.service 2>/dev/null || echo "disabled")
        echo "État: $status"
        
        if systemctl is-active indi.service > /dev/null 2>&1; then
            log_success "✅ Service INDI actif"
        else
            log_warning "❌ Service INDI inactif"
        fi
    else
        log_warning "❌ Service INDI non configuré"
    fi
    
    # Vérifier si indiserver est en cours d'exécution
    if pgrep -f "indiserver" > /dev/null; then
        log_success "✅ indiserver en cours d'exécution"
        echo "Processus:"
        pgrep -f "indiserver" | while read pid; do
            echo "  PID: $pid - $(ps -p $pid -o cmd --no-headers)"
        done
    else
        log_warning "❌ indiserver non actif"
    fi
}

# Tester la connectivité réseau
test_network() {
    separator
    log_info "🌐 TEST DE CONNECTIVITÉ RÉSEAU"
    separator
    
    # Test de connectivité générale
    if ping -c 1 8.8.8.8 > /dev/null 2>&1; then
        log_success "✅ Connectivité Internet OK"
    else
        log_error "❌ Pas de connectivité Internet"
        return 1
    fi
    
    # Test d'accès au dépôt INDI
    if curl -s --head https://ppa.launchpadcontent.net/mutlaqja/ppa/ubuntu/ > /dev/null; then
        log_success "✅ Accès au dépôt INDI OK"
    else
        log_warning "❌ Problème d'accès au dépôt INDI"
    fi
    
    # Test d'accès à la clé GPG
    if curl -s --head https://www.indilib.org/jdownloads/Ubuntu/indilib.gpg > /dev/null; then
        log_success "✅ Accès à la clé GPG OK"
    else
        log_warning "❌ Problème d'accès à la clé GPG"
    fi
}

# Générer un rapport de diagnostic
generate_report() {
    separator
    log_info "📊 RÉSUMÉ DU DIAGNOSTIC"
    separator
    
    local issues=0
    local warnings=0
    
    # Compter les problèmes potentiels
    if [[ ! -f /etc/apt/sources.list.d/indi.list ]]; then
        ((issues++))
    fi
    
    if [[ ! -f /etc/apt/keyrings/indilib.gpg ]]; then
        ((warnings++))
    fi
    
    local available_packages=$(apt-cache search "^indi-" 2>/dev/null | wc -l)
    if [[ $available_packages -eq 0 ]]; then
        ((issues++))
    fi
    
    if ! getent group indi > /dev/null 2>&1; then
        ((warnings++))
    fi
    
    # Afficher le résumé
    if [[ $issues -eq 0 ]]; then
        log_success "🎉 Aucun problème critique détecté"
    else
        log_error "❌ $issues problème(s) critique(s) détecté(s)"
    fi
    
    if [[ $warnings -gt 0 ]]; then
        log_warning "⚠️ $warnings avertissement(s)"
    fi
    
    echo ""
    log_info "📋 ACTIONS RECOMMANDÉES:"
    
    if [[ $issues -gt 0 ]]; then
        echo "  1. Exécuter le script de réparation: ./fix-indi-repository.sh"
        echo "  2. Relancer l'installation: ./install-indi-drivers.sh"
    fi
    
    if [[ $warnings -gt 0 ]]; then
        echo "  3. Configurer les permissions USB si nécessaire"
        echo "  4. Redémarrer le système pour appliquer les changements"
    fi
    
    if [[ $issues -eq 0 && $warnings -eq 0 ]]; then
        echo "  ✅ Système prêt pour l'astronomie!"
    fi
}

# Fonction principale
main() {
    log_info "🔍 DIAGNOSTIC COMPLET DU SYSTÈME INDI AIRASTRO"
    echo ""
    
    check_system_info
    check_repositories
    check_indi_packages
    check_usb_permissions
    check_services
    test_network
    generate_report
    
    echo ""
    log_info "🏁 Diagnostic terminé"
}

# Exécuter le diagnostic
main "$@"
