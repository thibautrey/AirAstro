#!/bin/bash

# Script de mise à jour complète du système AirAstro
# Inclut la mise à jour des drivers INDI et de la base de données d'équipements

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/var/log/airastro-update.log"
AIRASTRO_API_URL="http://localhost:3000"

# Fonction pour afficher les messages
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

# Fonction pour vérifier le statut du serveur AirAstro
check_airastro_server() {
    log_info "Vérification du serveur AirAstro..."
    
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -s "$AIRASTRO_API_URL/api/health" > /dev/null 2>&1; then
            log_success "Serveur AirAstro accessible"
            return 0
        fi
        
        log_info "Tentative $attempt/$max_attempts - Serveur non accessible, attente 10s..."
        sleep 10
        ((attempt++))
    done
    
    log_error "Impossible d'accéder au serveur AirAstro après $max_attempts tentatives"
    return 1
}

# Fonction pour démarrer le serveur AirAstro si nécessaire
start_airastro_server() {
    log_info "Démarrage du serveur AirAstro..."
    
    # Vérifier si le service systemd existe
    if systemctl list-units --type=service | grep -q airastro; then
        log_info "Démarrage via systemd..."
        sudo systemctl start airastro.service
        sleep 10
    else
        log_info "Démarrage manuel du serveur..."
        # Démarrer en arrière-plan
        cd "$SCRIPT_DIR/.."
        nohup npm start > /dev/null 2>&1 &
        sleep 15
    fi
    
    # Vérifier que le serveur est démarré
    if check_airastro_server; then
        log_success "Serveur AirAstro démarré avec succès"
    else
        log_error "Échec du démarrage du serveur AirAstro"
        return 1
    fi
}

# Fonction pour mettre à jour la base de données d'équipements
update_equipment_database() {
    log_info "Mise à jour de la base de données d'équipements..."
    
    # Vérifier si le serveur est accessible
    if ! check_airastro_server; then
        log_info "Serveur non accessible, tentative de démarrage..."
        start_airastro_server
    fi
    
    # Appeler l'API pour mettre à jour la base de données
    if curl -s -X POST "$AIRASTRO_API_URL/api/equipment/database/update" > /dev/null 2>&1; then
        log_success "Base de données d'équipements mise à jour via l'API"
    else
        log_warning "Échec de la mise à jour via l'API, continuons avec la mise à jour des drivers"
    fi
}

# Fonction pour mettre à jour tous les drivers INDI
update_indi_drivers() {
    log_info "Mise à jour de tous les drivers INDI..."
    
    # Utiliser le script de maintenance des drivers
    if [[ -f "$SCRIPT_DIR/maintain-indi-drivers.sh" ]]; then
        chmod +x "$SCRIPT_DIR/maintain-indi-drivers.sh"
        "$SCRIPT_DIR/maintain-indi-drivers.sh" auto-update
    else
        log_warning "Script de maintenance des drivers non trouvé, utilisation de apt-get"
        
        # Mettre à jour les packages
        sudo apt-get update > /dev/null 2>&1
        
        # Installer tous les drivers manquants
        local available_drivers
        available_drivers=$(apt-cache search "^indi-" | grep -E "^indi-[a-zA-Z]" | awk '{print $1}' | sort)
        
        if [[ -n "$available_drivers" ]]; then
            log_info "Installation des drivers manquants..."
            sudo apt-get install -y $available_drivers > /dev/null 2>&1
            
            # Mettre à jour les drivers existants
            sudo apt-get upgrade -y indi-* > /dev/null 2>&1
            
            log_success "Drivers INDI mis à jour"
        else
            log_warning "Aucun driver INDI trouvé dans les dépôts"
        fi
    fi
}

# Fonction pour mettre à jour le système de base
update_system() {
    log_info "Mise à jour du système de base..."
    
    # Mettre à jour la liste des packages
    sudo apt-get update > /dev/null 2>&1
    
    # Mettre à jour les packages système critiques
    sudo apt-get upgrade -y > /dev/null 2>&1
    
    log_success "Système de base mis à jour"
}

# Fonction pour nettoyer le système
cleanup_system() {
    log_info "Nettoyage du système..."
    
    # Supprimer les packages orphelins
    sudo apt-get autoremove -y > /dev/null 2>&1
    
    # Nettoyer le cache des packages
    sudo apt-get autoclean > /dev/null 2>&1
    
    # Nettoyer les logs anciens
    sudo journalctl --vacuum-time=7d > /dev/null 2>&1
    
    log_success "Nettoyage terminé"
}

# Fonction pour redémarrer les services
restart_services() {
    log_info "Redémarrage des services..."
    
    # Redémarrer le service INDI si il est actif
    if systemctl is-active --quiet indi.service; then
        log_info "Redémarrage du service INDI..."
        sudo systemctl restart indi.service
    fi
    
    # Redémarrer le service AirAstro si il existe
    if systemctl list-units --type=service | grep -q airastro; then
        log_info "Redémarrage du service AirAstro..."
        sudo systemctl restart airastro.service
    fi
    
    log_success "Services redémarrés"
}

# Fonction pour générer un rapport de mise à jour
generate_update_report() {
    log_info "Génération du rapport de mise à jour..."
    
    local report_file="/tmp/airastro-update-report.txt"
    
    {
        echo "=== RAPPORT DE MISE À JOUR AIRASTRO ==="
        echo "Généré le: $(date)"
        echo ""
        
        echo "=== DRIVERS INDI INSTALLÉS ==="
        dpkg -l | grep -E "^ii.*indi-" | awk '{print $2}' | sort
        echo ""
        
        echo "=== STATISTIQUES ==="
        local driver_count
        driver_count=$(dpkg -l | grep -E "^ii.*indi-" | wc -l)
        echo "Drivers INDI installés: $driver_count"
        
        echo ""
        echo "=== ESPACE DISQUE ==="
        df -h | grep -E "(/)$"
        
        echo ""
        echo "=== SERVICES ==="
        systemctl status indi.service --no-pager -l 2>/dev/null || echo "Service INDI non trouvé"
        systemctl status airastro.service --no-pager -l 2>/dev/null || echo "Service AirAstro non trouvé"
        
        echo ""
        echo "=== VERSION SYSTÈME ==="
        cat /etc/os-release
        
    } > "$report_file"
    
    log_success "Rapport généré: $report_file"
    
    # Afficher un résumé
    echo ""
    echo "=== RÉSUMÉ DE LA MISE À JOUR ==="
    echo "Drivers INDI installés: $(dpkg -l | grep -E "^ii.*indi-" | wc -l)"
    echo "Espace disque utilisé: $(df -h | grep -E "(/)$" | awk '{print $5}')"
    echo "Rapport complet: $report_file"
}

# Fonction pour vérifier les prérequis
check_prerequisites() {
    log_info "Vérification des prérequis..."
    
    # Vérifier sudo
    if ! sudo -n true 2>/dev/null; then
        log_error "Privilèges sudo requis"
        return 1
    fi
    
    # Vérifier curl
    if ! command -v curl > /dev/null 2>&1; then
        log_info "Installation de curl..."
        sudo apt-get install -y curl > /dev/null 2>&1
    fi
    
    # Vérifier la connectivité internet
    if ! curl -s --connect-timeout 5 https://google.com > /dev/null 2>&1; then
        log_warning "Pas de connectivité internet - certaines mises à jour pourraient échouer"
    fi
    
    log_success "Prérequis vérifiés"
}

# Fonction d'aide
show_help() {
    cat << EOF
Usage: $0 [OPTIONS]

OPTIONS:
    --drivers-only      Mettre à jour uniquement les drivers INDI
    --database-only     Mettre à jour uniquement la base de données d'équipements
    --system-only       Mettre à jour uniquement le système de base
    --no-cleanup        Ne pas nettoyer le système
    --no-restart        Ne pas redémarrer les services
    --help              Afficher cette aide

EXAMPLES:
    $0                  # Mise à jour complète
    $0 --drivers-only   # Mise à jour des drivers uniquement
    $0 --no-cleanup     # Mise à jour sans nettoyage

EOF
}

# Fonction principale
main() {
    local drivers_only=false
    local database_only=false
    local system_only=false
    local no_cleanup=false
    local no_restart=false
    
    # Parser les arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --drivers-only)
                drivers_only=true
                shift
                ;;
            --database-only)
                database_only=true
                shift
                ;;
            --system-only)
                system_only=true
                shift
                ;;
            --no-cleanup)
                no_cleanup=true
                shift
                ;;
            --no-restart)
                no_restart=true
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
    
    # Créer le fichier de log
    sudo touch "$LOG_FILE"
    sudo chmod 666 "$LOG_FILE"
    
    log_info "=== DÉMARRAGE DE LA MISE À JOUR AIRASTRO ==="
    log_info "Timestamp: $(date)"
    
    # Vérifier les prérequis
    check_prerequisites
    
    # Exécuter les mises à jour selon les options
    if [[ "$database_only" == true ]]; then
        update_equipment_database
    elif [[ "$drivers_only" == true ]]; then
        update_indi_drivers
    elif [[ "$system_only" == true ]]; then
        update_system
    else
        # Mise à jour complète
        update_system
        update_equipment_database
        update_indi_drivers
        
        if [[ "$no_cleanup" != true ]]; then
            cleanup_system
        fi
        
        if [[ "$no_restart" != true ]]; then
            restart_services
        fi
    fi
    
    # Générer le rapport
    generate_update_report
    
    log_success "=== MISE À JOUR TERMINÉE ==="
}

# Exécuter le script
main "$@"
