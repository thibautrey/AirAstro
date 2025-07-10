#!/bin/bash

# Script de surveillance en temps réel de l'installation INDI
# Affiche le statut actuel de l'installation et les packages en cours d'installation

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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

# Fonction pour afficher l'en-tête
show_header() {
    clear
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                 📺 SURVEILLANCE INSTALLATION INDI           ║${NC}"
    echo -e "${CYAN}║                      $(date '+%H:%M:%S - %d/%m/%Y')                     ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Fonction pour surveiller les processus
monitor_processes() {
    echo -e "${CYAN}🔄 PROCESSUS ACTIFS${NC}"
    echo "$(printf '─%.0s' {1..30})"
    
    # Vérifier les processus d'installation
    local install_processes=$(pgrep -f "install-indi-drivers.sh\|apt-get install\|dpkg" 2>/dev/null || true)
    
    if [[ -n "$install_processes" ]]; then
        echo -e "${GREEN}✅ Installation en cours${NC}"
        echo "$install_processes" | while read pid; do
            if [[ -n "$pid" ]]; then
                local cmd=$(ps -p $pid -o cmd --no-headers 2>/dev/null || echo "Processus terminé")
                echo -e "  PID: ${YELLOW}$pid${NC} - ${cmd:0:60}..."
            fi
        done
    else
        echo -e "${YELLOW}⚠️ Aucune installation active détectée${NC}"
    fi
    
    echo ""
}

# Fonction pour surveiller les packages
monitor_packages() {
    echo -e "${CYAN}📦 ÉTAT DES PACKAGES INDI${NC}"
    echo "$(printf '─%.0s' {1..30})"
    
    # Compter les packages installés
    local installed_count=$(dpkg -l | grep "^ii.*indi-" 2>/dev/null | wc -l)
    local total_available=$(apt-cache search "^indi-" 2>/dev/null | wc -l)
    
    echo -e "Installés: ${GREEN}$installed_count${NC} / Disponibles: ${BLUE}$total_available${NC}"
    
    if [[ $installed_count -gt 0 ]]; then
        echo ""
        echo -e "${YELLOW}Derniers packages installés:${NC}"
        dpkg -l | grep "^ii.*indi-" | tail -5 | awk '{print "  ✅ " $2}' 
    fi
    
    echo ""
}

# Fonction pour surveiller l'activité réseau
monitor_network() {
    echo -e "${CYAN}🌐 ACTIVITÉ RÉSEAU${NC}"
    echo "$(printf '─%.0s' {1..20})"
    
    # Vérifier si des téléchargements sont en cours
    if pgrep -f "wget\|curl\|apt-get" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Téléchargements actifs${NC}"
        
        # Essayer de voir l'activité réseau
        if command -v ss > /dev/null 2>&1; then
            local connections=$(ss -tuln | grep -E ":80|:443" | wc -l)
            echo -e "  Connexions actives: ${YELLOW}$connections${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️ Aucun téléchargement détecté${NC}"
    fi
    
    echo ""
}

# Fonction pour surveiller l'espace disque
monitor_disk() {
    echo -e "${CYAN}💾 ESPACE DISQUE${NC}"
    echo "$(printf '─%.0s' {1..20})"
    
    local disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    local available_space=$(df -h / | awk 'NR==2 {print $4}')
    
    if [[ $disk_usage -gt 90 ]]; then
        echo -e "Utilisation: ${RED}$disk_usage%${NC} - Disponible: ${RED}$available_space${NC}"
        log_warning "Espace disque faible !"
    elif [[ $disk_usage -gt 80 ]]; then
        echo -e "Utilisation: ${YELLOW}$disk_usage%${NC} - Disponible: ${YELLOW}$available_space${NC}"
    else
        echo -e "Utilisation: ${GREEN}$disk_usage%${NC} - Disponible: ${GREEN}$available_space${NC}"
    fi
    
    echo ""
}

# Fonction pour surveiller les erreurs
monitor_errors() {
    echo -e "${CYAN}⚠️ SURVEILLANCE DES ERREURS${NC}"
    echo "$(printf '─%.0s' {1..30})"
    
    # Vérifier les erreurs récentes dans les logs
    local error_count=0
    
    # Vérifier les erreurs APT
    if [[ -f /var/log/apt/term.log ]]; then
        local apt_errors=$(tail -n 20 /var/log/apt/term.log 2>/dev/null | grep -i "error\|failed\|unable" | wc -l)
        if [[ $apt_errors -gt 0 ]]; then
            echo -e "Erreurs APT récentes: ${RED}$apt_errors${NC}"
            ((error_count++))
        fi
    fi
    
    # Vérifier les erreurs DPKG
    if [[ -f /var/log/dpkg.log ]]; then
        local dpkg_errors=$(tail -n 20 /var/log/dpkg.log 2>/dev/null | grep -i "error\|failed" | wc -l)
        if [[ $dpkg_errors -gt 0 ]]; then
            echo -e "Erreurs DPKG récentes: ${RED}$dpkg_errors${NC}"
            ((error_count++))
        fi
    fi
    
    if [[ $error_count -eq 0 ]]; then
        echo -e "${GREEN}✅ Aucune erreur détectée${NC}"
    fi
    
    echo ""
}

# Fonction pour afficher les statistiques d'installation
show_installation_stats() {
    echo -e "${CYAN}📊 STATISTIQUES D'INSTALLATION${NC}"
    echo "$(printf '─%.0s' {1..40})"
    
    # Analyser les logs d'installation
    local start_time=""
    local packages_installed_today=0
    
    if [[ -f /var/log/dpkg.log ]]; then
        local today=$(date '+%Y-%m-%d')
        packages_installed_today=$(grep "^$today.*status installed" /var/log/dpkg.log 2>/dev/null | grep "indi-" | wc -l)
        
        if [[ $packages_installed_today -gt 0 ]]; then
            echo -e "Packages INDI installés aujourd'hui: ${GREEN}$packages_installed_today${NC}"
            
            # Trouver le début de l'installation
            local first_install=$(grep "^$today.*status installed" /var/log/dpkg.log 2>/dev/null | grep "indi-" | head -1 | awk '{print $2}')
            if [[ -n "$first_install" ]]; then
                echo -e "Début d'installation: ${YELLOW}$first_install${NC}"
            fi
        fi
    fi
    
    # Calculer la progression
    local total_indi_packages=$(apt-cache search "^indi-" 2>/dev/null | wc -l)
    local installed_indi_packages=$(dpkg -l | grep "^ii.*indi-" 2>/dev/null | wc -l)
    
    if [[ $total_indi_packages -gt 0 ]]; then
        local progress=$((installed_indi_packages * 100 / total_indi_packages))
        echo -e "Progression: ${CYAN}$progress%${NC} ($installed_indi_packages/$total_indi_packages)"
        
        # Barre de progression
        local bar_length=30
        local filled_length=$((progress * bar_length / 100))
        local bar=""
        for i in $(seq 1 $filled_length); do bar+="█"; done
        for i in $(seq $((filled_length + 1)) $bar_length); do bar+="░"; done
        echo -e "[$bar] $progress%"
    fi
    
    echo ""
}

# Fonction pour afficher les commandes utiles
show_useful_commands() {
    echo -e "${CYAN}🛠️ COMMANDES UTILES${NC}"
    echo "$(printf '─%.0s' {1..25})"
    echo "  q          - Quitter"
    echo "  r          - Rafraîchir maintenant"
    echo "  d          - Afficher les détails"
    echo "  l          - Afficher les logs"
    echo "  s          - Arrêter l'installation"
    echo ""
}

# Fonction pour afficher les détails
show_details() {
    clear
    echo -e "${CYAN}📋 DÉTAILS DE L'INSTALLATION${NC}"
    echo "$(printf '═%.0s' {1..50})"
    echo ""
    
    # Afficher les derniers packages installés
    echo -e "${YELLOW}Derniers packages installés:${NC}"
    if [[ -f /var/log/dpkg.log ]]; then
        local today=$(date '+%Y-%m-%d')
        grep "^$today.*status installed" /var/log/dpkg.log 2>/dev/null | grep "indi-" | tail -10 | while read line; do
            local package=$(echo "$line" | awk '{print $4}')
            local time=$(echo "$line" | awk '{print $2}')
            echo -e "  ${GREEN}✅${NC} $package ${YELLOW}($time)${NC}"
        done
    fi
    
    echo ""
    echo -e "${YELLOW}Appuyez sur Entrée pour revenir...${NC}"
    read -r
}

# Fonction pour afficher les logs
show_logs() {
    clear
    echo -e "${CYAN}📜 LOGS D'INSTALLATION${NC}"
    echo "$(printf '═%.0s' {1..50})"
    echo ""
    
    if [[ -f /var/log/apt/term.log ]]; then
        echo -e "${YELLOW}Dernières lignes d'APT:${NC}"
        tail -n 15 /var/log/apt/term.log 2>/dev/null || echo "Aucun log APT disponible"
    fi
    
    echo ""
    echo -e "${YELLOW}Appuyez sur Entrée pour revenir...${NC}"
    read -r
}

# Fonction pour arrêter l'installation
stop_installation() {
    echo -e "${YELLOW}Arrêt de l'installation...${NC}"
    
    # Trouver et arrêter les processus d'installation
    local install_pids=$(pgrep -f "install-indi-drivers.sh" 2>/dev/null || true)
    if [[ -n "$install_pids" ]]; then
        echo "$install_pids" | while read pid; do
            if [[ -n "$pid" ]]; then
                echo -e "Arrêt du processus $pid..."
                kill -TERM $pid 2>/dev/null || true
                sleep 2
                kill -KILL $pid 2>/dev/null || true
            fi
        done
        log_success "Installation arrêtée"
    else
        log_info "Aucune installation en cours"
    fi
    
    echo ""
    echo -e "${YELLOW}Appuyez sur Entrée pour continuer...${NC}"
    read -r
}

# Fonction principale de surveillance
main() {
    local refresh_interval=3
    local auto_refresh=true
    
    # Vérifier les privilèges
    if ! sudo -n true 2>/dev/null; then
        log_error "Ce script nécessite des privilèges sudo pour accéder aux logs"
        exit 1
    fi
    
    log_info "🚀 Démarrage de la surveillance INDI (Ctrl+C pour quitter)"
    sleep 2
    
    while true; do
        if [[ "$auto_refresh" == "true" ]]; then
            show_header
            monitor_processes
            monitor_packages
            monitor_network
            monitor_disk
            monitor_errors
            show_installation_stats
            show_useful_commands
            
            # Attendre avec possibilité d'interruption
            echo -e "${CYAN}Prochaine mise à jour dans $refresh_interval secondes...${NC}"
            
            # Lecture non-bloquante
            if read -t $refresh_interval -n 1 key 2>/dev/null; then
                case $key in
                    q|Q)
                        log_info "Arrêt de la surveillance"
                        exit 0
                        ;;
                    r|R)
                        continue
                        ;;
                    d|D)
                        show_details
                        ;;
                    l|L)
                        show_logs
                        ;;
                    s|S)
                        stop_installation
                        ;;
                esac
            fi
        else
            # Mode manuel
            show_header
            monitor_processes
            monitor_packages
            monitor_network
            monitor_disk
            monitor_errors
            show_installation_stats
            show_useful_commands
            
            echo -e "${CYAN}Entrez une commande (q/r/d/l/s):${NC} "
            read -r command
            
            case $command in
                q|Q)
                    log_info "Arrêt de la surveillance"
                    exit 0
                    ;;
                r|R)
                    continue
                    ;;
                d|D)
                    show_details
                    ;;
                l|L)
                    show_logs
                    ;;
                s|S)
                    stop_installation
                    ;;
                *)
                    log_warning "Commande non reconnue: $command"
                    sleep 2
                    ;;
            esac
        fi
    done
}

# Gestion des signaux
trap 'log_info "Arrêt de la surveillance..."; exit 0' SIGINT SIGTERM

# Exécuter la surveillance
main "$@"
