#!/bin/bash

# Script de maintenance des drivers INDI pour AirAstro
# Permet de maintenir à jour tous les drivers INDI disponibles

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
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

# Fonction pour lister tous les drivers INDI disponibles
list_available_drivers() {
    log_info "Récupération de la liste des drivers INDI disponibles..."
    
    # Mettre à jour la liste des packages
    sudo apt-get update > /dev/null 2>&1
    
    # Lister tous les packages indi-*
    local available_drivers
    available_drivers=$(apt-cache search "^indi-" | grep -E "^indi-[a-zA-Z]" | awk '{print $1}' | sort)
    
    if [[ -z "$available_drivers" ]]; then
        log_error "Aucun driver INDI trouvé dans les dépôts"
        return 1
    fi
    
    echo "$available_drivers"
}

# Fonction pour lister les drivers installés
list_installed_drivers() {
    log_info "Récupération de la liste des drivers INDI installés..."
    
    dpkg -l | grep -E "^ii.*indi-" | awk '{print $2}' | sort
}

# Fonction pour installer tous les drivers manquants
install_missing_drivers() {
    log_info "Installation de tous les drivers INDI manquants..."
    
    local available_drivers
    available_drivers=$(list_available_drivers)
    
    local installed_drivers
    installed_drivers=$(list_installed_drivers)
    
    local missing_drivers
    missing_drivers=$(comm -23 <(echo "$available_drivers") <(echo "$installed_drivers"))
    
    if [[ -z "$missing_drivers" ]]; then
        log_success "Tous les drivers INDI sont déjà installés"
        return 0
    fi
    
    local count
    count=$(echo "$missing_drivers" | wc -l)
    log_info "Installation de $count drivers manquants..."
    
    local installed=0
    local failed=0
    
    while read -r driver; do
        if [[ -n "$driver" ]]; then
            log_info "Installation de $driver..."
            if sudo apt-get install -y "$driver" > /dev/null 2>&1; then
                ((installed++))
                log_success "✅ $driver installé"
            else
                ((failed++))
                log_error "❌ Échec de l'installation de $driver"
            fi
        fi
    done <<< "$missing_drivers"
    
    log_success "Installation terminée: $installed nouveaux drivers installés ($failed échecs)"
}

# Fonction pour mettre à jour tous les drivers
update_all_drivers() {
    log_info "Mise à jour de tous les drivers INDI..."
    
    # Mettre à jour la liste des packages
    sudo apt-get update > /dev/null 2>&1
    
    # Mettre à jour tous les packages indi-*
    sudo apt-get upgrade -y indi-* > /dev/null 2>&1
    
    log_success "Mise à jour terminée"
}

# Fonction pour nettoyer les drivers orphelins
clean_orphaned_drivers() {
    log_info "Nettoyage des drivers orphelins..."
    
    # Supprimer les packages orphelins
    sudo apt-get autoremove -y > /dev/null 2>&1
    
    # Nettoyer le cache des packages
    sudo apt-get autoclean > /dev/null 2>&1
    
    log_success "Nettoyage terminé"
}

# Fonction pour créer un rapport des drivers
generate_driver_report() {
    log_info "Génération du rapport des drivers..."
    
    local report_file="/tmp/indi-drivers-report.txt"
    
    {
        echo "=== RAPPORT DES DRIVERS INDI ==="
        echo "Généré le: $(date)"
        echo ""
        
        echo "=== DRIVERS INSTALLÉS ==="
        list_installed_drivers
        echo ""
        
        echo "=== DRIVERS DISPONIBLES ==="
        list_available_drivers
        echo ""
        
        echo "=== STATISTIQUES ==="
        local installed_count
        installed_count=$(list_installed_drivers | wc -l)
        local available_count
        available_count=$(list_available_drivers | wc -l)
        
        echo "Drivers installés: $installed_count"
        echo "Drivers disponibles: $available_count"
        echo "Couverture: $((installed_count * 100 / available_count))%"
        echo ""
        
        echo "=== ESPACE DISQUE ==="
        du -sh /usr/share/indi 2>/dev/null || echo "Répertoire INDI non trouvé"
        dpkg -l | grep -E "^ii.*indi-" | awk '{print $2}' | xargs dpkg -L | wc -l | awk '{print "Fichiers installés: " $1}'
        
    } > "$report_file"
    
    log_success "Rapport généré: $report_file"
    cat "$report_file"
}

# Fonction pour configurer la mise à jour automatique
setup_automatic_updates() {
    log_info "Configuration de la mise à jour automatique..."
    
    # Créer le service systemd pour la mise à jour automatique
    cat << 'EOF' | sudo tee /etc/systemd/system/indi-driver-update.service > /dev/null
[Unit]
Description=INDI Driver Update Service
After=network.target

[Service]
Type=oneshot
ExecStart=/opt/airastro/server/scripts/maintain-indi-drivers.sh auto-update
User=root
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=indi-driver-update
EOF

    # Créer le timer pour exécuter la mise à jour quotidiennement
    cat << 'EOF' | sudo tee /etc/systemd/system/indi-driver-update.timer > /dev/null
[Unit]
Description=INDI Driver Update Timer
Requires=indi-driver-update.service

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
EOF

    # Activer et démarrer le timer
    sudo systemctl daemon-reload
    sudo systemctl enable indi-driver-update.timer
    sudo systemctl start indi-driver-update.timer
    
    log_success "Mise à jour automatique configurée (quotidienne)"
}

# Fonction pour l'installation depuis la base de données d'équipements
install_from_database() {
    log_info "Installation des drivers basée sur la base de données d'équipements..."
    
    # Appeler l'API AirAstro pour obtenir la liste des drivers requis
    local api_url="http://localhost:3000/api/equipment/required-drivers"
    
    if command -v curl > /dev/null 2>&1; then
        local required_drivers
        required_drivers=$(curl -s "$api_url" 2>/dev/null | jq -r '.drivers[]' 2>/dev/null)
        
        if [[ -n "$required_drivers" ]]; then
            log_info "Installation des drivers requis par la base de données..."
            
            local installed=0
            local failed=0
            
            while read -r driver; do
                if [[ -n "$driver" ]]; then
                    log_info "Installation de $driver (requis par la base de données)..."
                    if sudo apt-get install -y "$driver" > /dev/null 2>&1; then
                        ((installed++))
                        log_success "✅ $driver installé"
                    else
                        ((failed++))
                        log_error "❌ Échec de l'installation de $driver"
                    fi
                fi
            done <<< "$required_drivers"
            
            log_success "Installation terminée: $installed drivers requis installés ($failed échecs)"
        else
            log_warning "Impossible de récupérer la liste des drivers requis depuis l'API"
        fi
    else
        log_warning "curl non disponible, installation depuis la base de données ignorée"
    fi
}

# Fonction pour forcer la réinstallation de tous les drivers
force_reinstall_all() {
    log_warning "ATTENTION: Réinstallation forcée de tous les drivers INDI"
    read -p "Êtes-vous sûr de vouloir continuer? (y/N): " -r
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Opération annulée"
        return 0
    fi
    
    log_info "Suppression de tous les drivers INDI..."
    
    # Supprimer tous les packages indi-*
    local installed_drivers
    installed_drivers=$(list_installed_drivers)
    
    if [[ -n "$installed_drivers" ]]; then
        sudo apt-get remove -y $installed_drivers > /dev/null 2>&1
        log_success "Tous les drivers supprimés"
    fi
    
    # Réinstaller tous les drivers
    install_missing_drivers
}

# Fonction d'aide
show_help() {
    cat << EOF
Usage: $0 [COMMAND]

COMMANDS:
    list-available      Lister tous les drivers INDI disponibles
    list-installed      Lister tous les drivers INDI installés
    install-missing     Installer tous les drivers manquants
    update-all          Mettre à jour tous les drivers installés
    clean               Nettoyer les drivers orphelins
    report              Générer un rapport des drivers
    setup-auto-update   Configurer la mise à jour automatique
    install-from-db     Installer les drivers requis par la base de données
    force-reinstall     Forcer la réinstallation de tous les drivers
    auto-update         Mise à jour automatique (utilisé par systemd)
    help                Afficher cette aide

EXAMPLES:
    $0 install-missing  # Installer tous les drivers manquants
    $0 update-all       # Mettre à jour tous les drivers
    $0 report          # Générer un rapport complet
    $0 setup-auto-update # Configurer la mise à jour automatique

EOF
}

# Fonction pour la mise à jour automatique
auto_update() {
    log_info "Démarrage de la mise à jour automatique des drivers INDI..."
    
    # Mettre à jour la liste des packages
    sudo apt-get update > /dev/null 2>&1
    
    # Installer les drivers manquants
    install_missing_drivers
    
    # Mettre à jour les drivers existants
    update_all_drivers
    
    # Nettoyer
    clean_orphaned_drivers
    
    # Redémarrer le service INDI si nécessaire
    if systemctl is-active --quiet indi.service; then
        log_info "Redémarrage du service INDI..."
        sudo systemctl restart indi.service
    fi
    
    log_success "Mise à jour automatique terminée"
}

# Fonction principale
main() {
    local command="${1:-help}"
    
    case "$command" in
        "list-available")
            list_available_drivers
            ;;
        "list-installed")
            list_installed_drivers
            ;;
        "install-missing")
            install_missing_drivers
            ;;
        "update-all")
            update_all_drivers
            ;;
        "clean")
            clean_orphaned_drivers
            ;;
        "report")
            generate_driver_report
            ;;
        "setup-auto-update")
            setup_automatic_updates
            ;;
        "install-from-db")
            install_from_database
            ;;
        "force-reinstall")
            force_reinstall_all
            ;;
        "auto-update")
            auto_update
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Vérifier les privilèges sudo si nécessaire
if [[ "$1" =~ ^(install-missing|update-all|clean|setup-auto-update|force-reinstall|auto-update)$ ]]; then
    if ! sudo -n true 2>/dev/null; then
        log_error "Ce script nécessite des privilèges sudo pour cette opération"
        exit 1
    fi
fi

# Exécuter le script
main "$@"
