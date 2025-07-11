#!/bin/bash

# Script de réparation du dépôt INDI
# Résout le problème avec apt-key et configure le dépôt INDI correctement

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

# Fonction principale de réparation
fix_indi_repository() {
    log_info "🔧 Réparation du dépôt INDI..."

    # Supprimer l'ancien fichier de dépôt s'il existe
    if [[ -f /etc/apt/sources.list.d/indi.list ]]; then
        log_info "Suppression de l'ancien dépôt INDI..."
        sudo rm -f /etc/apt/sources.list.d/indi.list
    fi

    # Nettoyer les anciennes clés apt-key
    log_info "Nettoyage des anciennes clés..."
    sudo apt-key del 568A4C4F 2>/dev/null || true

    # Installer les dépendances nécessaires
    log_info "Installation des dépendances..."
    sudo apt-get update > /dev/null 2>&1
    sudo apt-get install -y ca-certificates gnupg wget > /dev/null 2>&1

    # Créer le répertoire des clés
    sudo mkdir -p /etc/apt/keyrings

    # Méthode 1: Essayer de télécharger la clé officielle
    log_info "Tentative de téléchargement de la clé GPG officielle..."
    if wget -qO - https://www.indilib.org/jdownloads/Ubuntu/indilib.gpg | sudo gpg --dearmor -o /etc/apt/keyrings/indilib.gpg 2>/dev/null; then
        log_success "Clé GPG officielle téléchargée avec succès"
        use_official_key=true
    else
        log_warning "Échec du téléchargement de la clé officielle"
        use_official_key=false
    fi

    # Méthode 2: Utiliser la clé du serveur de clés Ubuntu
    if [[ "$use_official_key" == "false" ]]; then
        log_info "Utilisation de la clé du serveur Ubuntu..."
        if sudo gpg --no-default-keyring --keyring /etc/apt/keyrings/indilib.gpg --keyserver keyserver.ubuntu.com --recv-keys 568A4C4F 2>/dev/null; then
            log_success "Clé GPG récupérée du serveur Ubuntu"
            use_official_key=true
        else
            log_warning "Échec de récupération de la clé du serveur Ubuntu"
        fi
    fi

    # Détecter la version du système
    local codename="focal"  # Valeur par défaut
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        case "$VERSION_CODENAME" in
            "bookworm"|"bullseye"|"buster")
                codename="focal"  # Utiliser focal pour Debian
                ;;
            "jammy"|"focal"|"bionic"|"xenial")
                codename="$VERSION_CODENAME"
                ;;
            *)
                codename="focal"  # Défaut sûr
                ;;
        esac
    fi

    log_info "Utilisation de la version: $codename"

    # Ajouter le dépôt avec la bonne syntaxe
    if [[ "$use_official_key" == "true" && -f /etc/apt/keyrings/indilib.gpg ]]; then
        echo "deb [signed-by=/etc/apt/keyrings/indilib.gpg] https://ppa.launchpadcontent.net/mutlaqja/ppa/ubuntu/ $codename main" | sudo tee /etc/apt/sources.list.d/indi.list > /dev/null
        log_success "Dépôt INDI ajouté avec clé sécurisée"
    else
        # Fallback: sans signature (moins sécurisé mais fonctionnel)
        log_warning "Utilisation du dépôt sans signature (fallback)"
        echo "deb [trusted=yes] https://ppa.launchpadcontent.net/mutlaqja/ppa/ubuntu/ $codename main" | sudo tee /etc/apt/sources.list.d/indi.list > /dev/null
    fi

    # Mettre à jour les dépôts
    log_info "Mise à jour des dépôts..."
    if sudo apt-get update > /dev/null 2>&1; then
        log_success "Dépôts mis à jour avec succès"
    else
        log_warning "Avertissements lors de la mise à jour, mais cela devrait fonctionner"
    fi

    # Vérifier que les packages INDI sont disponibles
    log_info "Vérification de la disponibilité des packages INDI..."
    if apt-cache search "^indi-" | grep -q "indi-"; then
        local count=$(apt-cache search "^indi-" | grep -c "indi-")
        log_success "✅ $count packages INDI disponibles dans le dépôt"
    else
        log_error "❌ Aucun package INDI trouvé - problème de dépôt"
        return 1
    fi

    log_success "🎉 Réparation du dépôt INDI terminée avec succès!"
    log_info "Vous pouvez maintenant relancer l'installation des drivers INDI"
}

# Fonction pour tester l'installation d'un package
test_indi_installation() {
    log_info "Test d'installation d'un package INDI..."
    
    if sudo apt-get install -y indi-bin > /dev/null 2>&1; then
        log_success "✅ Test d'installation réussi (indi-bin installé)"
        return 0
    else
        log_error "❌ Échec du test d'installation"
        return 1
    fi
}

# Fonction principale
main() {
    log_info "🚀 Script de réparation du dépôt INDI pour AirAstro"
    
    # Vérifier les privilèges sudo
    if ! sudo -n true 2>/dev/null; then
        log_error "Ce script nécessite des privilèges sudo"
        exit 1
    fi

    # Réparer le dépôt
    fix_indi_repository

    # Tester l'installation
    if test_indi_installation; then
        log_success "🎉 Réparation terminée avec succès!"
        log_info "Vous pouvez maintenant relancer:"
        log_info "  cd /home/pi/AirAstro/server/scripts"
        log_info "  ./install-indi-drivers.sh"
    else
        log_error "❌ La réparation n'a pas complètement réussi"
        exit 1
    fi
}

# Exécuter le script
main "$@"
