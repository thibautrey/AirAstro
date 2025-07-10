#!/bin/bash

# Script principal de résolution des problèmes INDI
# Détecte automatiquement le problème et propose les solutions appropriées

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

log_step() {
    echo -e "${CYAN}[ÉTAPE]${NC} $1"
}

# Fonction pour afficher le menu
show_menu() {
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                    🚀 AIRASTRO INDI MANAGER                 ║${NC}"
    echo -e "${CYAN}║                 Résolution des problèmes INDI               ║${NC}"
    echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${CYAN}║  1. 🔍 Diagnostic complet du système                        ║${NC}"
    echo -e "${CYAN}║  2. 🔧 Réparation automatique (recommandé)                  ║${NC}"
    echo -e "${CYAN}║  3. 🧹 Nettoyage complet et réinstallation                  ║${NC}"
    echo -e "${CYAN}║  4. 📦 Installation des drivers INDI                       ║${NC}"
    echo -e "${CYAN}║  5. 🔄 Mise à jour des drivers existants                    ║${NC}"
    echo -e "${CYAN}║  6. 📋 Afficher l'état actuel                               ║${NC}"
    echo -e "${CYAN}║  7. 📺 Suivre l'installation en temps réel                  ║${NC}"
    echo -e "${CYAN}║  8. 🆘 Aide et documentation                                ║${NC}"
    echo -e "${CYAN}║  0. 🚪 Quitter                                              ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Fonction pour obtenir le répertoire du script
get_script_dir() {
    cd "$(dirname "${BASH_SOURCE[0]}")"
    pwd
}

# Fonction pour vérifier les prérequis
check_prerequisites() {
    local script_dir=$(get_script_dir)

    # Vérifier que les scripts existent
    local required_scripts=(
        "diagnose-indi-system.sh"
        "fix-indi-repository.sh"
        "clean-indi-system.sh"
        "install-indi-drivers.sh"
    )

    for script in "${required_scripts[@]}"; do
        if [[ ! -f "$script_dir/$script" ]]; then
            log_error "Script manquant: $script"
            return 1
        fi

        # Rendre le script exécutable
        chmod +x "$script_dir/$script"
    done

    # Vérifier sudo
    if ! sudo -n true 2>/dev/null; then
        log_error "Ce script nécessite des privilèges sudo"
        return 1
    fi

    return 0
}

# Fonction de diagnostic rapide
quick_diagnosis() {
    log_info "🔍 Diagnostic rapide..."

    local issues=0

    # Vérifier le dépôt INDI
    if [[ ! -f /etc/apt/sources.list.d/indi.list ]]; then
        log_warning "❌ Dépôt INDI non configuré"
        ((issues++))
    fi

    # Vérifier les packages disponibles
    local available_packages=$(apt-cache search "^indi-" 2>/dev/null | wc -l)
    if [[ $available_packages -eq 0 ]]; then
        log_warning "❌ Aucun package INDI disponible"
        ((issues++))
    fi

    # Vérifier les packages installés
    local installed_packages=$(dpkg -l | grep "^ii.*indi-" | wc -l)
    if [[ $installed_packages -eq 0 ]]; then
        log_warning "❌ Aucun package INDI installé"
        ((issues++))
    fi

    return $issues
}

# Fonction pour recommander une action
recommend_action() {
    log_info "🎯 Analyse et recommandation..."

    if quick_diagnosis; then
        log_success "✅ Système semble fonctionnel"
        echo "   Recommandation: Vérifiez avec le diagnostic complet (option 1)"
        return 0
    else
        log_warning "⚠️ Problèmes détectés"
        echo "   Recommandation: Utilisez la réparation automatique (option 2)"
        return 1
    fi
}

# Exécuter le diagnostic complet
run_full_diagnosis() {
    log_step "1. Exécution du diagnostic complet"
    local script_dir=$(get_script_dir)

    if [[ -f "$script_dir/diagnose-indi-system.sh" ]]; then
        "$script_dir/diagnose-indi-system.sh"
        return $?
    else
        log_error "Script de diagnostic non trouvé"
        return 1
    fi
}

# Exécuter la réparation automatique
run_auto_repair() {
    log_step "2. Exécution de la réparation automatique"
    local script_dir=$(get_script_dir)

    if [[ -f "$script_dir/fix-indi-repository.sh" ]]; then
        "$script_dir/fix-indi-repository.sh"
        return $?
    else
        log_error "Script de réparation non trouvé"
        return 1
    fi
}

# Exécuter le nettoyage complet
run_full_cleanup() {
    log_step "3. Exécution du nettoyage complet"
    local script_dir=$(get_script_dir)

    if [[ -f "$script_dir/clean-indi-system.sh" ]]; then
        "$script_dir/clean-indi-system.sh"
        local result=$?

        if [[ $result -eq 0 ]]; then
            log_info "Nettoyage terminé, lancement de la réparation..."
            run_auto_repair
        fi

        return $result
    else
        log_error "Script de nettoyage non trouvé"
        return 1
    fi
}

# Exécuter l'installation des drivers
run_driver_installation() {
    log_step "4. Installation des drivers INDI"
    local script_dir=$(get_script_dir)

    if [[ -f "$script_dir/install-indi-drivers.sh" ]]; then
        "$script_dir/install-indi-drivers.sh"
        return $?
    else
        log_error "Script d'installation non trouvé"
        return 1
    fi
}

# Exécuter la mise à jour des drivers
run_driver_update() {
    log_step "5. Mise à jour des drivers INDI"
    local script_dir=$(get_script_dir)

    if [[ -f "$script_dir/install-indi-drivers.sh" ]]; then
        "$script_dir/install-indi-drivers.sh" update
        return $?
    else
        log_error "Script d'installation non trouvé"
        return 1
    fi
}

# Afficher l'état actuel
show_current_status() {
    log_step "6. État actuel du système"

    echo ""
    echo -e "${CYAN}📊 RÉSUMÉ DE L'ÉTAT${NC}"
    echo "$(printf '─%.0s' {1..40})"

    # Dépôt INDI
    if [[ -f /etc/apt/sources.list.d/indi.list ]]; then
        echo -e "Dépôt INDI:     ${GREEN}✅ Configuré${NC}"
    else
        echo -e "Dépôt INDI:     ${RED}❌ Non configuré${NC}"
    fi

    # Packages disponibles
    local available=$(apt-cache search "^indi-" 2>/dev/null | wc -l)
    if [[ $available -gt 0 ]]; then
        echo -e "Packages dispo: ${GREEN}✅ $available disponibles${NC}"
    else
        echo -e "Packages dispo: ${RED}❌ Aucun disponible${NC}"
    fi

    # Packages installés
    local installed=$(dpkg -l | grep "^ii.*indi-" | wc -l)
    if [[ $installed -gt 0 ]]; then
        echo -e "Packages inst.: ${GREEN}✅ $installed installés${NC}"
    else
        echo -e "Packages inst.: ${YELLOW}⚠️ Aucun installé${NC}"
    fi

    # Service INDI
    if systemctl is-active indi.service > /dev/null 2>&1; then
        echo -e "Service INDI:   ${GREEN}✅ Actif${NC}"
    else
        echo -e "Service INDI:   ${YELLOW}⚠️ Inactif${NC}"
    fi

    # Permissions USB
    if [[ -f /etc/udev/rules.d/99-astro-devices.rules ]]; then
        echo -e "Permissions:    ${GREEN}✅ Configurées${NC}"
    else
        echo -e "Permissions:    ${YELLOW}⚠️ Non configurées${NC}"
    fi

    echo ""
}

# Suivre l'installation en temps réel
monitor_installation() {
    log_step "7. Suivi de l'installation en temps réel"
    local script_dir=$(get_script_dir)
    
    echo ""
    echo -e "${CYAN}📺 SUIVI DE L'INSTALLATION INDI${NC}"
    echo "$(printf '═%.0s' {1..50})"
    echo ""
    
    # Vérifier si une installation est en cours
    if pgrep -f "install-indi-drivers.sh" > /dev/null; then
        log_info "Installation en cours détectée"
        
        # Afficher les processus actifs
        echo -e "${YELLOW}Processus actifs:${NC}"
        pgrep -f "install-indi-drivers.sh" | while read pid; do
            echo "  PID: $pid - $(ps -p $pid -o cmd --no-headers)"
        done
        
        echo ""
        log_info "Surveillance des logs du système..."
        echo -e "${YELLOW}Utilisez Ctrl+C pour arrêter le suivi${NC}"
        echo ""
        
        # Suivre les logs en temps réel
        timeout 300 tail -f /var/log/dpkg.log 2>/dev/null | grep -E "(install|configure)" --line-buffered | while read line; do
            if echo "$line" | grep -q "indi-"; then
                echo -e "${GREEN}[INSTALL]${NC} $line"
            fi
        done
        
    else
        log_info "Aucune installation en cours"
        echo ""
        
        # Proposer de démarrer une installation
        echo -e "${YELLOW}Voulez-vous démarrer l'installation des drivers INDI? [y/N]:${NC} "
        read -r response
        
        if [[ "$response" =~ ^[yY]$ ]]; then
            log_info "Démarrage de l'installation..."
            
            # Lancer l'installation en arrière-plan
            if [[ -f "$script_dir/install-indi-drivers.sh" ]]; then
                "$script_dir/install-indi-drivers.sh" &
                local install_pid=$!
                
                log_info "Installation démarrée (PID: $install_pid)"
                echo ""
                
                # Surveiller l'installation
                while kill -0 $install_pid 2>/dev/null; do
                    echo -e "${BLUE}[INFO]${NC} Installation en cours... (PID: $install_pid)"
                    
                    # Afficher les packages en cours d'installation
                    if pgrep -f "apt-get install" > /dev/null; then
                        local current_package=$(ps aux | grep "apt-get install" | grep -v grep | head -1 | sed 's/.*apt-get install[^a-zA-Z]*//g' | cut -d' ' -f1)
                        if [[ -n "$current_package" ]]; then
                            echo -e "${YELLOW}  → Installation de: $current_package${NC}"
                        fi
                    fi
                    
                    sleep 3
                done
                
                wait $install_pid
                local exit_code=$?
                
                if [[ $exit_code -eq 0 ]]; then
                    log_success "✅ Installation terminée avec succès"
                else
                    log_error "❌ Installation échouée (code: $exit_code)"
                fi
                
            else
                log_error "Script d'installation non trouvé"
            fi
        fi
    fi
    
    echo ""
    echo -e "${CYAN}📊 ÉTAT POST-INSTALLATION${NC}"
    echo "$(printf '─%.0s' {1..30})"
    
    # Afficher un résumé rapide
    local installed_count=$(dpkg -l | grep "^ii.*indi-" | wc -l)
    echo -e "Packages INDI installés: ${GREEN}$installed_count${NC}"
    
    if [[ $installed_count -gt 0 ]]; then
        echo "Derniers packages installés:"
        dpkg -l | grep "^ii.*indi-" | tail -5 | awk '{print "  " $2}' 
    fi
}

# Afficher l'aide
show_help() {
    log_step "8. Aide et documentation"

    echo ""
    echo -e "${CYAN}🆘 AIDE ET DOCUMENTATION${NC}"
    echo "$(printf '═%.0s' {1..50})"
    echo ""
    echo -e "${YELLOW}PROBLÈME ACTUEL:${NC}"
    echo "  L'erreur 'apt-key is deprecated' et 'no valid OpenPGP data found'"
    echo "  indique que l'ancienne méthode d'ajout de clés GPG ne fonctionne plus."
    echo ""
    echo -e "${YELLOW}SOLUTIONS PROPOSÉES:${NC}"
    echo "  1. ${GREEN}Réparation automatique${NC} (recommandée)"
    echo "     - Corrige automatiquement les problèmes de dépôt"
    echo "     - Utilise les nouvelles méthodes sécurisées"
    echo "     - Préserve les configurations existantes"
    echo ""
    echo "  2. ${GREEN}Nettoyage complet${NC} (si réparation échoue)"
    echo "     - Supprime toutes les configurations INDI"
    echo "     - Repart sur une base propre"
    echo "     - Recommandé en cas de problèmes multiples"
    echo ""
    echo -e "${YELLOW}ORDRE D'EXÉCUTION RECOMMANDÉ:${NC}"
    echo "  1. Diagnostic complet (option 1)"
    echo "  2. Réparation automatique (option 2)"
    echo "  3. Installation des drivers (option 4)"
    echo "  4. Suivi en temps réel (option 7) - pendant l'installation"
    echo "  5. Vérification finale (option 6)"
    echo ""
    echo -e "${YELLOW}SCRIPTS DISPONIBLES:${NC}"
    echo "  - diagnose-indi-system.sh  : Diagnostic complet"
    echo "  - fix-indi-repository.sh   : Réparation automatique"
    echo "  - clean-indi-system.sh     : Nettoyage complet"
    echo "  - install-indi-drivers.sh  : Installation des drivers"
    echo ""
    echo -e "${YELLOW}AIDE SUPPLÉMENTAIRE:${NC}"
    echo "  - Documentation: README.md dans le dossier server/"
    echo "  - Logs: Les scripts affichent des messages détaillés"
    echo "  - Support: Vérifiez les issues sur le projet GitHub"
    echo ""
}

# Fonction principale
main() {
    # Vérifier les prérequis
    if ! check_prerequisites; then
        log_error "Impossible de continuer sans les prérequis"
        exit 1
    fi

    # Boucle principale du menu
    while true; do
        clear
        show_menu
        recommend_action

        echo ""
        echo -e "${CYAN}Choisissez une option (0-8):${NC} "
        read -r choice

        case $choice in
            1)
                echo ""
                run_full_diagnosis
                ;;
            2)
                echo ""
                run_auto_repair
                ;;
            3)
                echo ""
                run_full_cleanup
                ;;
            4)
                echo ""
                run_driver_installation
                ;;
            5)
                echo ""
                run_driver_update
                ;;
            6)
                echo ""
                show_current_status
                ;;
            7)
                echo ""
                monitor_installation
                ;;
            8)
                echo ""
                show_help
                ;;
            0)
                echo ""
                log_info "🚪 Au revoir!"
                exit 0
                ;;
            *)
                echo ""
                log_error "Option invalide: $choice"
                ;;
        esac

        echo ""
        echo -e "${CYAN}Appuyez sur Entrée pour continuer...${NC}"
        read -r
    done
}

# Exécuter le script principal
main "$@"
