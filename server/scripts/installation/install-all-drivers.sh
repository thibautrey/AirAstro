#!/bin/bash

# Script d'installation unifié des drivers INDI pour AirAstro
# Ce script combine l'installation des drivers essentiels et complets

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

# Obtenir le répertoire du script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Fonction d'aide
show_help() {
    cat << EOF
Usage: $0 [OPTIONS]

Options:
    --essential-only    Installer uniquement les drivers essentiels
    --full             Installer tous les drivers disponibles (par défaut)
    --help             Afficher cette aide

Description:
    Ce script installe les drivers INDI nécessaires pour AirAstro.

    Mode essential-only : Installe uniquement les drivers de base les plus courants
    Mode full : Installe tous les drivers disponibles (recommandé)

Exemples:
    $0                    # Installation complète (recommandé)
    $0 --full            # Installation complète
    $0 --essential-only  # Installation minimale
EOF
}

# Analyser les arguments
INSTALL_MODE="full"
while [[ $# -gt 0 ]]; do
    case $1 in
        --essential-only)
            INSTALL_MODE="essential"
            shift
            ;;
        --full)
            INSTALL_MODE="full"
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            log_error "Option inconnue: $1"
            show_help
            exit 1
            ;;
    esac
done

log_info "🚀 Installation des drivers INDI pour AirAstro"
log_info "Mode d'installation: $INSTALL_MODE"

# Vérifier la disponibilité des scripts
ESSENTIAL_SCRIPT="$SCRIPT_DIR/install-drivers.sh"
FULL_SCRIPT="$SCRIPT_DIR/install-indi-drivers.sh"

if [[ ! -f "$ESSENTIAL_SCRIPT" ]]; then
    log_error "Script d'installation des drivers essentiels non trouvé: $ESSENTIAL_SCRIPT"
    exit 1
fi

if [[ ! -f "$FULL_SCRIPT" ]]; then
    log_error "Script d'installation complète non trouvé: $FULL_SCRIPT"
    exit 1
fi

# Rendre les scripts exécutables
chmod +x "$ESSENTIAL_SCRIPT"
chmod +x "$FULL_SCRIPT"

# Exécuter l'installation selon le mode choisi
case $INSTALL_MODE in
    essential)
        log_info "🔧 Installation des drivers essentiels uniquement"
        "$ESSENTIAL_SCRIPT"
        ;;
    full)
        log_info "🔧 Installation des drivers essentiels"
        "$ESSENTIAL_SCRIPT"

        log_info "🔧 Installation des drivers avancés"
        "$FULL_SCRIPT" full
        ;;
esac

log_success "✅ Installation des drivers INDI terminée"
log_info "📝 Les logs détaillés sont disponibles dans /tmp/"
