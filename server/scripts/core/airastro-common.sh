#!/bin/bash

# Utilitaires communs pour les scripts AirAstro
# Ce script peut être sourcé par d'autres scripts pour utiliser des fonctions communes

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration des répertoires
AIRASTRO_BASE_PATH="/opt/airastro"
AIRASTRO_VERSIONS_DIR="$AIRASTRO_BASE_PATH/versions"
AIRASTRO_CURRENT_SYMLINK="$AIRASTRO_BASE_PATH/current"
AIRASTRO_BACKUPS_DIR="$AIRASTRO_BASE_PATH/backups"
AIRASTRO_LOGS_DIR="$AIRASTRO_BASE_PATH/logs"
AIRASTRO_CONFIG_DIR="$AIRASTRO_BASE_PATH/config"

# Fonction de logging commune
airastro_log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    case "$level" in
        "INFO")
            echo -e "${GREEN}[INFO]${NC} $message"
            ;;
        "WARN")
            echo -e "${YELLOW}[WARN]${NC} $message"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} $message" >&2
            ;;
        "DEBUG")
            echo -e "${BLUE}[DEBUG]${NC} $message"
            ;;
        *)
            echo -e "${GREEN}[AirAstro]${NC} $message"
            ;;
    esac
}

# Fonctions raccourcies pour la compatibilité avec les scripts existants
log_info() {
    airastro_log "INFO" "$1"
}

log_warning() {
    airastro_log "WARN" "$1"
}

log_error() {
    airastro_log "ERROR" "$1"
}

log_debug() {
    airastro_log "DEBUG" "$1"
}

# Fonction pour les messages de succès
log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Fonction pour les messages d'avertissement avec couleur
log_warn() {
    airastro_log "WARN" "$1"
}

# Fonction pour les messages d'échec
log_fail() {
    echo -e "${RED}[FAIL]${NC} $1" >&2
}

# Fonction pour exécuter des commandes avec ou sans sudo
run_command() {
    if [ "$(id -u)" -eq 0 ]; then
        bash -c "$*"
    else
        sudo bash -c "$*"
    fi
}

# Fonction pour initialiser les répertoires AirAstro
init_airastro_directories() {
    airastro_log "INFO" "Initialisation des répertoires AirAstro"

    # Créer le répertoire de base
    if [ ! -d "$AIRASTRO_BASE_PATH" ]; then
        if [ "$(id -u)" -eq 0 ]; then
            mkdir -p "$AIRASTRO_BASE_PATH"
            chmod 755 "$AIRASTRO_BASE_PATH"
        else
            sudo mkdir -p "$AIRASTRO_BASE_PATH"
            sudo chmod 755 "$AIRASTRO_BASE_PATH"
        fi
        airastro_log "INFO" "Répertoire de base créé: $AIRASTRO_BASE_PATH"
    fi

    # Créer les sous-répertoires
    for dir in "$AIRASTRO_VERSIONS_DIR" "$AIRASTRO_BACKUPS_DIR" "$AIRASTRO_LOGS_DIR" "$AIRASTRO_CONFIG_DIR"; do
        if [ ! -d "$dir" ]; then
            if [ "$(id -u)" -eq 0 ]; then
                mkdir -p "$dir"
            else
                sudo mkdir -p "$dir"
            fi
            airastro_log "INFO" "Répertoire créé: $dir"
        fi
    done

    airastro_log "INFO" "Initialisation des répertoires terminée"
}

# Fonction pour vérifier les permissions
check_airastro_permissions() {
    if [ ! -d "$AIRASTRO_BASE_PATH" ]; then
        if [ "$(id -u)" -eq 0 ]; then
            return 0
        elif sudo -n true 2>/dev/null; then
            return 0
        else
            airastro_log "ERROR" "Privilèges root requis pour créer $AIRASTRO_BASE_PATH"
            airastro_log "ERROR" "Veuillez exécuter avec sudo ou configurer sudo sans mot de passe"
            return 1
        fi
    fi
    return 0
}

# Fonction pour valider que nous sommes dans un environnement AirAstro
validate_airastro_environment() {
    local script_dir="$1"

    # Chercher le répertoire racine du projet
    local project_root=""
    local current_dir="$script_dir"

    while [ "$current_dir" != "/" ]; do
        if [ -f "$current_dir/server/package.json" ] && [ -f "$current_dir/README.md" ]; then
            project_root="$current_dir"
            break
        fi
        current_dir="$(dirname "$current_dir")"
    done

    if [ -z "$project_root" ]; then
        airastro_log "ERROR" "Impossible de trouver le répertoire racine d'AirAstro"
        return 1
    fi

    echo "$project_root"
    return 0
}

# Fonction d'initialisation complète
init_airastro_environment() {
    airastro_log "INFO" "Initialisation de l'environnement AirAstro"

    # Vérifier les permissions
    if ! check_airastro_permissions; then
        return 1
    fi

    # Initialiser les répertoires
    init_airastro_directories

    return 0
}

# Export des fonctions si le script est sourcé
if [ "${BASH_SOURCE[0]}" != "${0}" ]; then
    # Le script est sourcé, exporter les fonctions
    export -f airastro_log
    export -f log_info
    export -f log_warning
    export -f log_error
    export -f log_debug
    export -f log_success
    export -f log_warn
    export -f log_fail
    export -f run_command
    export -f init_airastro_directories
    export -f check_airastro_permissions
    export -f validate_airastro_environment
    export -f init_airastro_environment
fi
