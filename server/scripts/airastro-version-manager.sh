#!/bin/bash

# AirAstro Version Manager
# Gestion des versions avec téléchargement, installation et rollback

# Configuration
BASE_PATH="/opt/airastro"
VERSIONS_DIR="$BASE_PATH/versions"
CURRENT_SYMLINK="$BASE_PATH/current"
BACKUPS_DIR="$BASE_PATH/backups"
LOGS_DIR="$BASE_PATH/logs"
CONFIG_FILE="$BASE_PATH/config/version.json"
GITHUB_REPO="https://github.com/thibautdewit/AirAstro"
GITHUB_API="https://api.github.com/repos/thibautdewit/AirAstro"

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction de logging
log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    case "$level" in
        "INFO")
            echo -e "${GREEN}[INFO]${NC} $timestamp - $message" | tee -a "$LOGS_DIR/version-manager.log"
            ;;
        "WARN")
            echo -e "${YELLOW}[WARN]${NC} $timestamp - $message" | tee -a "$LOGS_DIR/version-manager.log"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} $timestamp - $message" | tee -a "$LOGS_DIR/version-manager.log"
            ;;
        "DEBUG")
            echo -e "${BLUE}[DEBUG]${NC} $timestamp - $message" | tee -a "$LOGS_DIR/version-manager.log"
            ;;
    esac
# Initialisation des répertoires
initialize_directories() {
    log "INFO" "Initializing version management directories"
    
    for dir in "$VERSIONS_DIR" "$BACKUPS_DIR" "$LOGS_DIR"; do
        if [[ ! -d "$dir" ]]; then
            mkdir -p "$dir"
            log "INFO" "Created directory: $dir"
        fi
    done
}

# Vérification des permissions
check_permissions() {
    if [[ $EUID -ne 0 ]]; then
        log "ERROR" "This script must be run as root"
        exit 1
    fi
}

# Obtenir la version actuelle
get_current_version() {
    if [[ -L "$CURRENT_SYMLINK" ]]; then
        local current_path=$(readlink "$CURRENT_SYMLINK")
        basename "$current_path"
    else
        echo "none"
    fi
}

# Lister les versions disponibles
list_versions() {
    log "INFO" "Available versions:"
    if [[ -d "$VERSIONS_DIR" ]]; then
        for version_dir in "$VERSIONS_DIR"/*; do
            if [[ -d "$version_dir" ]]; then
                local version=$(basename "$version_dir")
                local current=$(get_current_version)
                if [[ "$version" == "$current" ]]; then
                    echo -e "  ${GREEN}* $version${NC} (current)"
                else
                    echo "    $version"
                fi
            fi
        done
    else
        echo "  No versions found"
    fi
}

# Télécharger une version depuis GitHub
download_version() {
    local tag="$1"
    local version_dir="$VERSIONS_DIR/$tag"
    
    if [[ -d "$version_dir" ]]; then
        log "WARN" "Version $tag already exists at $version_dir"
        return 0
    fi
    
    log "INFO" "Downloading version $tag"
    
    # Créer le répertoire de la version
    mkdir -p "$version_dir"
    
    # URL du tarball
    local tarball_url="$GITHUB_REPO/archive/refs/tags/$tag.tar.gz"
    
    # Télécharger et extraire
    log "INFO" "Downloading from: $tarball_url"
    
    if curl -L "$tarball_url" | tar -xz -C "$version_dir" --strip-components=1; then
        log "INFO" "Successfully downloaded version $tag"
        return 0
    else
        log "ERROR" "Failed to download version $tag"
        rm -rf "$version_dir"
        return 1
    fi
}

# Construire une version
build_version() {
    local tag="$1"
    local version_dir="$VERSIONS_DIR/$tag"
    
    if [[ ! -d "$version_dir" ]]; then
        log "ERROR" "Version directory not found: $version_dir"
        return 1
    fi
    
    log "INFO" "Building version $tag"
    
    # Aller dans le répertoire de la version
    cd "$version_dir"
    
    # Installer les dépendances et construire le serveur
    if [[ -f "server/package.json" ]]; then
        log "INFO" "Installing server dependencies"
        cd server
        npm install --production
        
        if [[ -f "tsconfig.json" ]]; then
            log "INFO" "Building TypeScript server"
            npm run build || {
                log "ERROR" "Failed to build server"
                return 1
            }
        fi
        cd ..
    fi
    
    # Construire l'application web
    if [[ -f "apps/web/package.json" ]]; then
        log "INFO" "Building web application"
        cd apps/web
        npm install
        npm run build || {
            log "ERROR" "Failed to build web application"
            return 1
        }
        cd ../..
    fi
    
    log "INFO" "Successfully built version $tag"
    return 0
}

# Effectuer la sauvegarde
create_backup() {
    local version_tag="$1"
    local backup_name="backup_$(date +%Y%m%d_%H%M%S)_$version_tag"
    local backup_path="$BACKUPS_DIR/$backup_name"
    
    if [[ -L "$CURRENT_SYMLINK" ]]; then
        local current_path=$(readlink "$CURRENT_SYMLINK")
        if [[ -d "$current_path" ]]; then
            log "INFO" "Creating backup: $backup_name"
            cp -r "$current_path" "$backup_path"
            log "INFO" "Backup created successfully"
        fi
    fi
    
    # Nettoyer les anciennes sauvegardes (garder les 10 dernières)
    cleanup_backups
}

# Nettoyer les anciennes sauvegardes
cleanup_backups() {
    local max_backups=10
    local backup_count=$(ls -1 "$BACKUPS_DIR" 2>/dev/null | wc -l)
    
    if [[ $backup_count -gt $max_backups ]]; then
        log "INFO" "Cleaning up old backups (keeping $max_backups)"
        ls -1t "$BACKUPS_DIR" | tail -n +$((max_backups + 1)) | while read -r backup; do
            rm -rf "$BACKUPS_DIR/$backup"
            log "INFO" "Removed old backup: $backup"
        done
    fi
}

# Basculer vers une version
switch_version() {
    local tag="$1"
    local version_dir="$VERSIONS_DIR/$tag"
    
    if [[ ! -d "$version_dir" ]]; then
        log "ERROR" "Version directory not found: $version_dir"
        return 1
    fi
    
    local current_version=$(get_current_version)
    
    # Créer une sauvegarde si une version est active
    if [[ "$current_version" != "none" ]]; then
        create_backup "$current_version"
    fi
    
    log "INFO" "Switching to version $tag"
    
    # Supprimer l'ancien lien symbolique
    if [[ -L "$CURRENT_SYMLINK" ]]; then
        rm "$CURRENT_SYMLINK"
    fi
    
    # Créer le nouveau lien symbolique
    ln -s "$version_dir" "$CURRENT_SYMLINK"
    
    if [[ $? -eq 0 ]]; then
        log "INFO" "Successfully switched to version $tag"
        
        # Mettre à jour le fichier de configuration
        update_config "$tag"
        
        return 0
    else
        log "ERROR" "Failed to switch to version $tag"
        return 1
    fi
}

# Mettre à jour le fichier de configuration
update_config() {
    local tag="$1"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    if [[ -f "$CONFIG_FILE" ]]; then
        # Utiliser jq pour mettre à jour le JSON
        if command -v jq &> /dev/null; then
            local temp_file=$(mktemp)
            jq ".currentTag = \"$tag\" | .lastUpdate = \"$timestamp\"" "$CONFIG_FILE" > "$temp_file"
            mv "$temp_file" "$CONFIG_FILE"
            log "INFO" "Updated configuration file"
        else
            log "WARN" "jq not available, configuration file not updated"
        fi
    fi
}

# Rollback vers la dernière sauvegarde
rollback() {
    local latest_backup=$(ls -1t "$BACKUPS_DIR" 2>/dev/null | head -n 1)
    
    if [[ -z "$latest_backup" ]]; then
        log "ERROR" "No backups available for rollback"
        return 1
    fi
    
    log "INFO" "Rolling back to: $latest_backup"
    
    # Supprimer le lien symbolique actuel
    if [[ -L "$CURRENT_SYMLINK" ]]; then
        rm "$CURRENT_SYMLINK"
    fi
    
    # Créer un lien vers la sauvegarde
    ln -s "$BACKUPS_DIR/$latest_backup" "$CURRENT_SYMLINK"
    
    if [[ $? -eq 0 ]]; then
        log "INFO" "Rollback successful"
        return 0
    else
        log "ERROR" "Rollback failed"
        return 1
    fi
}

# Afficher l'aide
show_help() {
    echo "AirAstro Version Manager"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  init                    Initialize version management directories"
    echo "  list                    List available versions"
    echo "  current                 Show current version"
    echo "  download <tag>          Download a specific version"
    echo "  build <tag>             Build a specific version"
    echo "  install <tag>           Download, build and switch to a version"
    echo "  switch <tag>            Switch to an existing version"
    echo "  rollback                Rollback to the latest backup"
    echo "  cleanup                 Clean up old backups and versions"
    echo "  help                    Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 install v1.2.3       Install version v1.2.3"
    echo "  $0 switch v1.2.2        Switch to version v1.2.2"
    echo "  $0 rollback              Rollback to previous version"
}

# Fonction principale
main() {
    local command="$1"
    local arg="$2"
    
    # Vérifier les permissions
    check_permissions
    
    # Initialiser les répertoires
    initialize_directories
    
    case "$command" in
        "init")
            log "INFO" "Version manager initialized"
            ;;
        "list")
            list_versions
            ;;
        "current")
            local current=$(get_current_version)
            echo "Current version: $current"
            ;;
        "download")
            if [[ -z "$arg" ]]; then
                log "ERROR" "Version tag required"
                exit 1
            fi
            download_version "$arg"
            ;;
        "build")
            if [[ -z "$arg" ]]; then
                log "ERROR" "Version tag required"
                exit 1
            fi
            build_version "$arg"
            ;;
        "install")
            if [[ -z "$arg" ]]; then
                log "ERROR" "Version tag required"
                exit 1
            fi
            download_version "$arg" && build_version "$arg" && switch_version "$arg"
            ;;
        "switch")
            if [[ -z "$arg" ]]; then
                log "ERROR" "Version tag required"
                exit 1
            fi
            switch_version "$arg"
            ;;
        "rollback")
            rollback
            ;;
        "cleanup")
            cleanup_backups
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        *)
            log "ERROR" "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# Exécuter la fonction principale
main "$@"
            ;;
        "backup")
            create_backup
            ;;
        "init")
            init_directories
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Vérifier les permissions
if [ "$1" = "switch" ] || [ "$1" = "cleanup" ] || [ "$1" = "backup" ] || [ "$1" = "init" ]; then
    if [ "$(id -u)" -ne 0 ] && ! sudo -n true 2>/dev/null; then
        error "Cette commande nécessite des privilèges sudo"
        exit 1
    fi
fi

main "$@"
