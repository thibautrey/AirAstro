#!/bin/bash

# Script de nettoyage complet du système INDI
# Supprime toutes les configurations, clés et dépôts INDI existants

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

# Fonction pour demander confirmation
confirm() {
    local message="$1"
    local default="${2:-n}"
    
    if [[ "$default" == "y" ]]; then
        echo -e "${YELLOW}$message [Y/n]:${NC} "
    else
        echo -e "${YELLOW}$message [y/N]:${NC} "
    fi
    
    read -r response
    case "$response" in
        [yY]|[yY][eE][sS])
            return 0
            ;;
        [nN]|[nN][oO])
            return 1
            ;;
        "")
            [[ "$default" == "y" ]] && return 0 || return 1
            ;;
        *)
            confirm "$message" "$default"
            ;;
    esac
}

# Nettoyer les dépôts INDI
clean_repositories() {
    log_info "🗑️ Nettoyage des dépôts INDI..."
    
    # Supprimer le fichier de dépôt
    if [[ -f /etc/apt/sources.list.d/indi.list ]]; then
        sudo rm -f /etc/apt/sources.list.d/indi.list
        log_success "✅ Fichier de dépôt INDI supprimé"
    fi
    
    # Supprimer les anciennes clés apt-key
    log_info "Suppression des anciennes clés apt-key..."
    sudo apt-key del 568A4C4F 2>/dev/null || true
    sudo apt-key del "INDI Library" 2>/dev/null || true
    
    # Supprimer les clés GPG modernes
    if [[ -f /etc/apt/keyrings/indilib.gpg ]]; then
        sudo rm -f /etc/apt/keyrings/indilib.gpg
        log_success "✅ Clé GPG INDI supprimée"
    fi
    
    log_success "✅ Nettoyage des dépôts terminé"
}

# Désinstaller les packages INDI
uninstall_indi_packages() {
    log_info "📦 Désinstallation des packages INDI..."
    
    # Obtenir la liste des packages INDI installés
    local installed_packages
    installed_packages=$(dpkg -l | grep "^ii.*indi-" | awk '{print $2}' | tr '\n' ' ')
    
    if [[ -n "$installed_packages" ]]; then
        log_info "Packages INDI installés trouvés:"
        echo "$installed_packages" | tr ' ' '\n' | sed 's/^/  /'
        
        if confirm "Désinstaller tous les packages INDI?"; then
            sudo apt-get remove --purge -y $installed_packages > /dev/null 2>&1
            log_success "✅ Packages INDI désinstallés"
        else
            log_info "Conservation des packages INDI"
        fi
    else
        log_info "Aucun package INDI installé"
    fi
    
    # Nettoyer les dépendances orphelines
    sudo apt-get autoremove -y > /dev/null 2>&1
    log_success "✅ Dépendances orphelines nettoyées"
}

# Supprimer les configurations USB
clean_usb_configuration() {
    log_info "🔌 Nettoyage des configurations USB..."
    
    # Supprimer les règles udev
    if [[ -f /etc/udev/rules.d/99-astro-devices.rules ]]; then
        sudo rm -f /etc/udev/rules.d/99-astro-devices.rules
        log_success "✅ Règles udev supprimées"
    fi
    
    # Supprimer l'utilisateur du groupe indi
    if groups | grep -q "indi"; then
        sudo deluser "$USER" indi 2>/dev/null || true
        log_success "✅ Utilisateur retiré du groupe indi"
    fi
    
    # Supprimer le groupe indi (si pas d'autres utilisateurs)
    if getent group indi > /dev/null 2>&1; then
        local group_members=$(getent group indi | cut -d: -f4)
        if [[ -z "$group_members" ]]; then
            sudo delgroup indi 2>/dev/null || true
            log_success "✅ Groupe indi supprimé"
        else
            log_info "Groupe indi conservé (autres utilisateurs présents)"
        fi
    fi
    
    # Recharger les règles udev
    sudo udevadm control --reload-rules
    sudo udevadm trigger
    
    log_success "✅ Configuration USB nettoyée"
}

# Supprimer les services INDI
clean_services() {
    log_info "🔧 Nettoyage des services INDI..."
    
    # Arrêter le service INDI s'il est actif
    if systemctl is-active indi.service > /dev/null 2>&1; then
        sudo systemctl stop indi.service
        log_success "✅ Service INDI arrêté"
    fi
    
    # Désactiver le service INDI
    if systemctl is-enabled indi.service > /dev/null 2>&1; then
        sudo systemctl disable indi.service
        log_success "✅ Service INDI désactivé"
    fi
    
    # Supprimer le fichier de service
    if [[ -f /etc/systemd/system/indi.service ]]; then
        sudo rm -f /etc/systemd/system/indi.service
        log_success "✅ Fichier de service INDI supprimé"
    fi
    
    # Supprimer l'utilisateur indi
    if id "indi" > /dev/null 2>&1; then
        sudo userdel -r indi 2>/dev/null || true
        log_success "✅ Utilisateur indi supprimé"
    fi
    
    # Recharger systemd
    sudo systemctl daemon-reload
    
    # Tuer tous les processus indiserver
    sudo pkill -f "indiserver" 2>/dev/null || true
    
    log_success "✅ Services INDI nettoyés"
}

# Nettoyer le cache APT
clean_apt_cache() {
    log_info "🧹 Nettoyage du cache APT..."
    
    sudo apt-get clean
    sudo apt-get autoclean
    
    log_success "✅ Cache APT nettoyé"
}

# Nettoyer les fichiers temporaires
clean_temp_files() {
    log_info "🗂️ Nettoyage des fichiers temporaires..."
    
    # Supprimer les fichiers temporaires d'installation
    sudo rm -f /tmp/indi-* 2>/dev/null || true
    sudo rm -f /tmp/airastro-* 2>/dev/null || true
    
    log_success "✅ Fichiers temporaires nettoyés"
}

# Mettre à jour les dépôts après nettoyage
update_repositories() {
    log_info "🔄 Mise à jour des dépôts après nettoyage..."
    
    if sudo apt-get update > /dev/null 2>&1; then
        log_success "✅ Dépôts mis à jour"
    else
        log_warning "⚠️ Avertissements lors de la mise à jour (normal après nettoyage)"
    fi
}

# Vérifier l'état après nettoyage
verify_cleanup() {
    log_info "🔍 Vérification du nettoyage..."
    
    local issues=0
    
    # Vérifier qu'aucun dépôt INDI n'existe
    if [[ -f /etc/apt/sources.list.d/indi.list ]]; then
        log_error "❌ Fichier de dépôt INDI encore présent"
        ((issues++))
    fi
    
    # Vérifier qu'aucune clé GPG n'existe
    if [[ -f /etc/apt/keyrings/indilib.gpg ]]; then
        log_error "❌ Clé GPG INDI encore présente"
        ((issues++))
    fi
    
    # Vérifier qu'aucun package INDI n'est installé
    local remaining_packages
    remaining_packages=$(dpkg -l | grep "^ii.*indi-" | wc -l)
    if [[ $remaining_packages -gt 0 ]]; then
        log_error "❌ $remaining_packages packages INDI encore installés"
        ((issues++))
    fi
    
    # Vérifier qu'aucun service INDI n'existe
    if [[ -f /etc/systemd/system/indi.service ]]; then
        log_error "❌ Service INDI encore présent"
        ((issues++))
    fi
    
    if [[ $issues -eq 0 ]]; then
        log_success "✅ Nettoyage complet réussi"
    else
        log_error "❌ $issues problème(s) détecté(s) après nettoyage"
    fi
    
    return $issues
}

# Fonction principale
main() {
    log_info "🧹 NETTOYAGE COMPLET DU SYSTÈME INDI AIRASTRO"
    echo ""
    
    log_warning "⚠️ ATTENTION: Ce script va supprimer TOUTES les configurations INDI existantes"
    log_warning "⚠️ Cela inclut les dépôts, packages, services et configurations USB"
    echo ""
    
    if ! confirm "Êtes-vous sûr de vouloir continuer?"; then
        log_info "Nettoyage annulé"
        exit 0
    fi
    
    # Vérifier les privilèges sudo
    if ! sudo -n true 2>/dev/null; then
        log_error "Ce script nécessite des privilèges sudo"
        exit 1
    fi
    
    echo ""
    log_info "🚀 Démarrage du nettoyage complet..."
    
    clean_services
    clean_usb_configuration
    uninstall_indi_packages
    clean_repositories
    clean_apt_cache
    clean_temp_files
    update_repositories
    
    echo ""
    if verify_cleanup; then
        log_success "🎉 Nettoyage complet terminé avec succès!"
        echo ""
        log_info "📋 PROCHAINES ÉTAPES:"
        echo "  1. Exécuter le script de réparation: ./fix-indi-repository.sh"
        echo "  2. Relancer l'installation: ./install-indi-drivers.sh"
        echo "  3. Redémarrer le système si nécessaire"
    else
        log_error "❌ Le nettoyage n'est pas complètement terminé"
        echo ""
        log_info "📋 ACTIONS RECOMMANDÉES:"
        echo "  1. Exécuter le diagnostic: ./diagnose-indi-system.sh"
        echo "  2. Corriger manuellement les problèmes restants"
        echo "  3. Relancer ce script si nécessaire"
    fi
}

# Exécuter le script
main "$@"
