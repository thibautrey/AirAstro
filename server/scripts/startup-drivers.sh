#!/bin/bash

# Script de démarrage pour AirAstro - Gestion automatique des drivers
# Ce script est exécuté au démarrage du serveur AirAstro pour s'assurer que
# tous les drivers INDI sont installés et à jour

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/var/log/airastro-startup.log"
LOCK_FILE="/tmp/airastro-startup.lock"
CONFIG_FILE="$SCRIPT_DIR/../config/equipment.env"

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
log_info() {
    echo -e "${BLUE}[STARTUP-INFO]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[STARTUP-SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[STARTUP-WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[STARTUP-ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

# Fonction pour charger la configuration
load_config() {
    if [[ -f "$CONFIG_FILE" ]]; then
        source "$CONFIG_FILE"
        log_info "Configuration chargée depuis $CONFIG_FILE"
    else
        log_warning "Fichier de configuration non trouvé: $CONFIG_FILE"
        # Valeurs par défaut
        INSTALL_ALL_DRIVERS=true
        UPDATE_DRIVERS_ON_START=true
        UPDATE_DRIVERS_DAILY=true
    fi
}

# Fonction pour vérifier le verrou
check_lock() {
    if [[ -f "$LOCK_FILE" ]]; then
        local pid
        pid=$(cat "$LOCK_FILE")

        if kill -0 "$pid" 2>/dev/null; then
            log_warning "Une autre instance du script de démarrage est en cours d'exécution (PID: $pid)"
            return 1
        else
            log_info "Verrou périmé détecté, suppression..."
            rm -f "$LOCK_FILE"
        fi
    fi

    # Créer le verrou
    echo $$ > "$LOCK_FILE"
    return 0
}

# Fonction pour nettoyer le verrou
cleanup_lock() {
    rm -f "$LOCK_FILE"
}

# Fonction pour vérifier si c'est le premier démarrage
is_first_startup() {
    local marker_file="/opt/airastro/.first-startup-done"

    if [[ ! -f "$marker_file" ]]; then
        return 0 # Premier démarrage
    else
        return 1 # Pas le premier démarrage
    fi
}

# Fonction pour marquer le premier démarrage comme terminé
mark_first_startup_done() {
    local marker_file="/opt/airastro/.first-startup-done"
    sudo mkdir -p "$(dirname "$marker_file")"
    sudo touch "$marker_file"
    sudo chmod 644 "$marker_file"
}

# Fonction pour installer tous les drivers INDI
install_all_drivers() {
    log_info "Installation de tous les drivers INDI..."

    if [[ -f "$SCRIPT_DIR/install-indi-drivers.sh" ]]; then
        chmod +x "$SCRIPT_DIR/install-indi-drivers.sh"
        "$SCRIPT_DIR/install-indi-drivers.sh" full
        log_success "Installation des drivers terminée"
    else
        log_error "Script d'installation des drivers non trouvé"
        return 1
    fi
}

# Fonction pour mettre à jour les drivers
update_drivers() {
    log_info "Mise à jour des drivers INDI..."

    if [[ -f "$SCRIPT_DIR/maintain-indi-drivers.sh" ]]; then
        chmod +x "$SCRIPT_DIR/maintain-indi-drivers.sh"
        "$SCRIPT_DIR/maintain-indi-drivers.sh" install-missing
        "$SCRIPT_DIR/maintain-indi-drivers.sh" update-all
        log_success "Mise à jour des drivers terminée"
    else
        log_warning "Script de maintenance des drivers non trouvé, utilisation de apt"

        # Fallback avec apt
        sudo apt-get update > /dev/null 2>&1
        sudo apt-get upgrade -y indi-* > /dev/null 2>&1

        # Installer les drivers manquants
        local available_drivers
        available_drivers=$(apt-cache search "^indi-" | grep -E "^indi-[a-zA-Z]" | awk '{print $1}')

        if [[ -n "$available_drivers" ]]; then
            sudo apt-get install -y $available_drivers > /dev/null 2>&1
        fi

        log_success "Mise à jour des drivers terminée (fallback)"
    fi
}

# Fonction pour vérifier la santé du système
health_check() {
    log_info "Vérification de la santé du système..."

    # Vérifier l'espace disque
    local disk_usage
    disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')

    if [[ $disk_usage -gt 85 ]]; then
        log_warning "Espace disque faible: ${disk_usage}% utilisé"
    else
        log_info "Espace disque OK: ${disk_usage}% utilisé"
    fi

    # Vérifier la mémoire
    local mem_usage
    mem_usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')

    if [[ $mem_usage -gt 80 ]]; then
        log_warning "Utilisation mémoire élevée: ${mem_usage}%"
    else
        log_info "Utilisation mémoire OK: ${mem_usage}%"
    fi

    # Vérifier les services
    local services=("indi" "airastro")
    for service in "${services[@]}"; do
        if systemctl list-units --type=service | grep -q "$service"; then
            if systemctl is-active --quiet "$service.service"; then
                log_info "Service $service: actif"
            else
                log_warning "Service $service: inactif"
            fi
        else
            log_info "Service $service: non configuré"
        fi
    done

    log_success "Vérification de santé terminée"
}

# Fonction pour configurer la mise à jour quotidienne
setup_daily_update() {
    log_info "Configuration de la mise à jour quotidienne..."

    if [[ -f "$SCRIPT_DIR/maintain-indi-drivers.sh" ]]; then
        chmod +x "$SCRIPT_DIR/maintain-indi-drivers.sh"
        "$SCRIPT_DIR/maintain-indi-drivers.sh" setup-auto-update
        log_success "Mise à jour quotidienne configurée"
    else
        log_warning "Script de maintenance non trouvé, configuration manuelle nécessaire"
    fi
}

# Fonction pour nettoyer les anciens logs
cleanup_logs() {
    log_info "Nettoyage des anciens logs..."

    # Nettoyer les logs de plus de 7 jours
    if [[ -f "$LOG_FILE" ]]; then
        # Garder seulement les 1000 dernières lignes
        tail -n 1000 "$LOG_FILE" > "${LOG_FILE}.tmp"
        mv "${LOG_FILE}.tmp" "$LOG_FILE"
    fi

    # Nettoyer les logs système
    sudo journalctl --vacuum-time=7d > /dev/null 2>&1

    log_success "Nettoyage des logs terminé"
}

# Fonction pour générer un rapport de démarrage
generate_startup_report() {
    log_info "Génération du rapport de démarrage..."

    local report_file="/tmp/airastro-startup-report.txt"

    {
        echo "=== RAPPORT DE DÉMARRAGE AIRASTRO ==="
        echo "Généré le: $(date)"
        echo ""

        echo "=== CONFIGURATION ==="
        echo "INSTALL_ALL_DRIVERS: ${INSTALL_ALL_DRIVERS:-false}"
        echo "UPDATE_DRIVERS_ON_START: ${UPDATE_DRIVERS_ON_START:-false}"
        echo "UPDATE_DRIVERS_DAILY: ${UPDATE_DRIVERS_DAILY:-false}"
        echo ""

        echo "=== DRIVERS INDI ==="
        local driver_count
        driver_count=$(dpkg -l | grep -E "^ii.*indi-" | wc -l)
        echo "Drivers installés: $driver_count"
        echo ""

        echo "=== SYSTÈME ==="
        echo "Espace disque: $(df -h / | tail -1 | awk '{print $5}') utilisé"
        echo "Mémoire: $(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')% utilisée"
        echo ""

        echo "=== SERVICES ==="
        systemctl is-active indi.service 2>/dev/null && echo "INDI: actif" || echo "INDI: inactif"
        systemctl is-active airastro.service 2>/dev/null && echo "AirAstro: actif" || echo "AirAstro: inactif"

    } > "$report_file"

    log_success "Rapport de démarrage généré: $report_file"
}

# Fonction principale
main() {
    # Créer le fichier de log
    sudo touch "$LOG_FILE"
    sudo chmod 666 "$LOG_FILE"

    log_info "=== DÉMARRAGE DU SCRIPT DE STARTUP AIRASTRO ==="
    log_info "Timestamp: $(date)"

    # Vérifier le verrou
    if ! check_lock; then
        exit 1
    fi

    # Nettoyer le verrou à la sortie
    trap cleanup_lock EXIT

    # Charger la configuration
    load_config

    # Déterminer s'il s'agit du premier démarrage
    local is_first=false
    if is_first_startup; then
        is_first=true
        log_info "Premier démarrage détecté"
    fi

    # Vérifier la santé du système
    health_check

    # Nettoyer les anciens logs
    cleanup_logs

    # Actions selon la configuration
    if [[ "$INSTALL_ALL_DRIVERS" == "true" ]] && [[ "$is_first" == true ]]; then
        log_info "Installation initiale de tous les drivers INDI..."
        install_all_drivers
    elif [[ "$UPDATE_DRIVERS_ON_START" == "true" ]]; then
        log_info "Mise à jour des drivers au démarrage..."
        update_drivers
    fi

    # Configurer la mise à jour quotidienne
    if [[ "$UPDATE_DRIVERS_DAILY" == "true" ]]; then
        setup_daily_update
    fi

    # Marquer le premier démarrage comme terminé
    if [[ "$is_first" == true ]]; then
        mark_first_startup_done
        log_success "Premier démarrage terminé avec succès"
    fi

    # Générer le rapport
    generate_startup_report

    log_success "=== SCRIPT DE STARTUP TERMINÉ ==="
}

# Exécuter le script en arrière-plan pour ne pas bloquer le démarrage du serveur
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    # Exécuter en arrière-plan
    main "$@" &
    log_info "Script de démarrage lancé en arrière-plan (PID: $!)"
fi
