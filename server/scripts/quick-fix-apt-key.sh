#!/bin/bash

# Script de résolution rapide du problème apt-key
# Corrige immédiatement l'erreur "apt-key is deprecated" pour INDI

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

# Fonction principale de correction
fix_indi_apt_key_issue() {
    log_info "🔧 Résolution rapide du problème apt-key INDI"
    
    # Étape 1: Nettoyer les anciennes configurations
    log_info "Nettoyage des anciennes configurations..."
    
    # Supprimer l'ancien fichier de dépôt
    sudo rm -f /etc/apt/sources.list.d/indi.list
    
    # Nettoyer les anciennes clés
    sudo apt-key del 568A4C4F 2>/dev/null || true
    
    # Étape 2: Installer les dépendances
    log_info "Installation des dépendances nécessaires..."
    sudo apt-get update > /dev/null 2>&1
    sudo apt-get install -y ca-certificates gnupg wget curl > /dev/null 2>&1
    
    # Étape 3: Créer le répertoire pour les clés modernes
    sudo mkdir -p /etc/apt/keyrings
    
    # Étape 4: Télécharger la clé GPG avec la nouvelle méthode
    log_info "Téléchargement de la clé GPG INDI..."
    
    # Essayer plusieurs méthodes pour obtenir la clé
    local key_success=false
    
    # Méthode 1: Clé officielle INDI
    if wget -qO - https://www.indilib.org/jdownloads/Ubuntu/indilib.gpg | sudo gpg --dearmor -o /etc/apt/keyrings/indilib.gpg 2>/dev/null; then
        log_success "✅ Clé officielle INDI téléchargée"
        key_success=true
    else
        log_warning "⚠️ Échec du téléchargement de la clé officielle"
    fi
    
    # Méthode 2: Clé depuis le serveur de clés Ubuntu
    if [[ "$key_success" == "false" ]]; then
        log_info "Tentative avec le serveur de clés Ubuntu..."
        if sudo gpg --no-default-keyring --keyring /etc/apt/keyrings/indilib.gpg --keyserver keyserver.ubuntu.com --recv-keys 568A4C4F 2>/dev/null; then
            log_success "✅ Clé récupérée depuis le serveur Ubuntu"
            key_success=true
        fi
    fi
    
    # Méthode 3: Clé depuis un serveur alternatif
    if [[ "$key_success" == "false" ]]; then
        log_info "Tentative avec un serveur alternatif..."
        if sudo gpg --no-default-keyring --keyring /etc/apt/keyrings/indilib.gpg --keyserver keys.openpgp.org --recv-keys 568A4C4F 2>/dev/null; then
            log_success "✅ Clé récupérée depuis le serveur alternatif"
            key_success=true
        fi
    fi
    
    # Étape 5: Détecter la version du système
    local codename="focal"
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        case "$VERSION_CODENAME" in
            "bookworm"|"bullseye"|"buster")
                codename="focal"  # Compatible avec Debian
                ;;
            "jammy"|"focal"|"bionic")
                codename="$VERSION_CODENAME"
                ;;
            *)
                codename="focal"
                ;;
        esac
    fi
    
    log_info "Version détectée: $codename"
    
    # Étape 6: Ajouter le dépôt avec la bonne syntaxe
    if [[ "$key_success" == "true" ]]; then
        echo "deb [signed-by=/etc/apt/keyrings/indilib.gpg] https://ppa.launchpadcontent.net/mutlaqja/ppa/ubuntu/ $codename main" | sudo tee /etc/apt/sources.list.d/indi.list > /dev/null
        log_success "✅ Dépôt INDI ajouté avec signature sécurisée"
    else
        log_warning "⚠️ Ajout du dépôt sans signature (méthode de secours)"
        echo "deb [trusted=yes] https://ppa.launchpadcontent.net/mutlaqja/ppa/ubuntu/ $codename main" | sudo tee /etc/apt/sources.list.d/indi.list > /dev/null
    fi
    
    # Étape 7: Mettre à jour les dépôts
    log_info "Mise à jour des dépôts..."
    if sudo apt-get update > /dev/null 2>&1; then
        log_success "✅ Mise à jour réussie"
    else
        log_warning "⚠️ Avertissements lors de la mise à jour (peut être normal)"
    fi
    
    # Étape 8: Vérifier que les packages INDI sont disponibles
    log_info "Vérification des packages INDI..."
    local available_packages=$(apt-cache search "^indi-" 2>/dev/null | wc -l)
    
    if [[ $available_packages -gt 0 ]]; then
        log_success "✅ $available_packages packages INDI disponibles"
        
        # Afficher quelques exemples
        echo "Exemples de packages disponibles:"
        apt-cache search "^indi-" | head -5 | sed 's/^/  /'
        
        return 0
    else
        log_error "❌ Aucun package INDI disponible"
        return 1
    fi
}

# Test rapide d'installation
test_installation() {
    log_info "Test d'installation d'un package..."
    
    if sudo apt-get install -y indi-bin > /dev/null 2>&1; then
        log_success "✅ Test réussi - indi-bin installé"
        return 0
    else
        log_error "❌ Test échoué"
        return 1
    fi
}

# Fonction principale
main() {
    log_info "🚀 RÉSOLUTION RAPIDE DU PROBLÈME APT-KEY INDI"
    echo ""
    
    # Vérifier sudo
    if ! sudo -n true 2>/dev/null; then
        log_error "Ce script nécessite des privilèges sudo"
        exit 1
    fi
    
    # Corriger le problème
    if fix_indi_apt_key_issue; then
        log_success "🎉 Problème corrigé avec succès!"
        
        # Tester l'installation
        echo ""
        log_info "Test de l'installation..."
        if test_installation; then
            log_success "✅ Installation fonctionnelle"
        else
            log_warning "⚠️ Problème lors du test d'installation"
        fi
        
        echo ""
        log_info "📋 PROCHAINES ÉTAPES:"
        echo "  1. Relancer l'installation complète des drivers:"
        echo "     cd /home/pi/AirAstro/server/scripts"
        echo "     ./install-indi-drivers.sh"
        echo ""
        echo "  2. Ou utiliser le manager INDI:"
        echo "     ./indi-manager.sh"
        
    else
        log_error "❌ Impossible de corriger le problème"
        echo ""
        log_info "📋 SOLUTIONS ALTERNATIVES:"
        echo "  1. Exécuter le nettoyage complet:"
        echo "     ./clean-indi-system.sh"
        echo ""
        echo "  2. Utiliser le manager INDI pour un diagnostic:"
        echo "     ./indi-manager.sh"
        
        exit 1
    fi
}

# Exécuter le script
main "$@"
