#!/bin/bash
set -e

# Script central de gestion des équipements par marque
# Supporte différentes marques de caméras et équipements astronomiques

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Source des fonctions communes
if [ -f "$SCRIPT_DIR/core/airastro-common.sh" ]; then
    source "$SCRIPT_DIR/core/airastro-common.sh"
else
    # Fallback: définir les fonctions de base si le fichier commun n'est pas disponible
    log_info() { echo -e "\033[0;32m[INFO]\033[0m $1"; }
    log_success() { echo -e "\033[0;32m[SUCCESS]\033[0m $1"; }
    log_error() { echo -e "\033[0;31m[ERROR]\033[0m $1" >&2; }
    log_warning() { echo -e "\033[1;33m[WARN]\033[0m $1"; }
    log_debug() { echo -e "\033[0;34m[DEBUG]\033[0m $1"; }
    echo -e "\033[1;33m[WARN]\033[0m Fichier commun non trouvé, utilisation des fonctions de base"
fi

# Configuration des marques supportées
declare -A SUPPORTED_BRANDS=(
    ["asi"]="ZWO ASI Cameras"
    ["qhy"]="QHY Cameras"
    ["canon"]="Canon DSLR"
    ["nikon"]="Nikon DSLR"
    ["celestron"]="Celestron Equipment"
    ["skywatcher"]="Sky-Watcher Equipment"
)

# Fonction d'aide
show_help() {
    echo "Usage: $0 [COMMANDE] [MARQUE] [OPTIONS]"
    echo
    echo "Commandes:"
    echo "  install [MARQUE]     Installer le support pour une marque"
    echo "  diagnose [MARQUE]    Diagnostiquer les problèmes d'une marque"
    echo "  test [MARQUE]        Tester l'installation d'une marque"
    echo "  list                 Lister les marques supportées"
    echo "  detect               Détecter automatiquement les équipements"
    echo "  status               Afficher le statut de tous les équipements"
    echo
    echo "Marques supportées:"
    for brand in "${!SUPPORTED_BRANDS[@]}"; do
        echo "  $brand - ${SUPPORTED_BRANDS[$brand]}"
    done
    echo
    echo "Exemples:"
    echo "  $0 install asi       # Installer le support ZWO ASI"
    echo "  $0 diagnose asi      # Diagnostiquer les problèmes ASI"
    echo "  $0 detect            # Détecter automatiquement les équipements"
    echo "  $0 status            # Afficher le statut général"
}

# Fonction de détection automatique
detect_equipment() {
    log_info "🔍 Détection automatique des équipements"
    echo
    
    # Détecter via lsusb
    log_info "Analyse des périphériques USB..."
    
    # Caméras ASI/ZWO
    if lsusb | grep -q "03c3"; then
        log_success "Caméra(s) ZWO ASI détectée(s):"
        lsusb | grep "03c3" | sed 's/^/  /'
        echo "  💡 Utilisez: $0 install asi"
    fi
    
    # Caméras QHY
    if lsusb | grep -q "1618"; then
        log_success "Caméra(s) QHY détectée(s):"
        lsusb | grep "1618" | sed 's/^/  /'
        echo "  💡 Utilisez: $0 install qhy"
    fi
    
    # Caméras Canon
    if lsusb | grep -q "04a9"; then
        log_success "Caméra(s) Canon détectée(s):"
        lsusb | grep "04a9" | sed 's/^/  /'
        echo "  💡 Utilisez: $0 install canon"
    fi
    
    # Caméras Nikon
    if lsusb | grep -q "04b0"; then
        log_success "Caméra(s) Nikon détectée(s):"
        lsusb | grep "04b0" | sed 's/^/  /'
        echo "  💡 Utilisez: $0 install nikon"
    fi
    
    # Montures (détection générique)
    if lsusb | grep -q -E "(067b|0403)"; then
        log_success "Monture/Équipement série détecté:"
        lsusb | grep -E "(067b|0403)" | sed 's/^/  /'
        echo "  💡 Vérifiez la marque de votre monture"
    fi
    
    echo
    log_info "Détection terminée"
}

# Fonction de statut général
show_status() {
    log_info "📊 Statut des équipements AirAstro"
    echo
    
    # Vérifier les services
    log_info "Services:"
    for service in indiserver airastro; do
        if systemctl is-active --quiet "$service" 2>/dev/null; then
            echo "  ✅ $service: actif"
        else
            echo "  ❌ $service: inactif"
        fi
    done
    
    echo
    log_info "Drivers INDI installés:"
    INDI_DRIVERS=$(find /usr -name "indi_*" -type f -executable 2>/dev/null | head -10)
    if [ -n "$INDI_DRIVERS" ]; then
        echo "$INDI_DRIVERS" | while read -r driver; do
            driver_name=$(basename "$driver")
            echo "  ✅ $driver_name"
        done
    else
        echo "  ❌ Aucun driver INDI trouvé"
    fi
    
    echo
    log_info "Modules Python installés:"
    PYTHON_MODULES=("zwoasi" "pyindi_client" "astropy" "numpy")
    for module in "${PYTHON_MODULES[@]}"; do
        if python3 -c "import $module" 2>/dev/null; then
            echo "  ✅ $module"
        else
            echo "  ❌ $module"
        fi
    done
    
    echo
    log_info "Équipements détectés:"
    detect_equipment
}

# Fonction d'installation par marque
install_brand() {
    local brand="$1"
    local brand_dir="$SCRIPT_DIR/brands/$brand"
    
    if [ ! -d "$brand_dir" ]; then
        log_error "Marque '$brand' non supportée"
        echo "Marques disponibles: ${!SUPPORTED_BRANDS[*]}"
        return 1
    fi
    
    log_info "Installation du support pour ${SUPPORTED_BRANDS[$brand]}"
    
    # Chercher le script d'installation
    local install_script=""
    for script_name in "install-${brand}-complete.sh" "install-${brand}.sh" "install.sh"; do
        if [ -f "$brand_dir/$script_name" ]; then
            install_script="$brand_dir/$script_name"
            break
        fi
    done
    
    if [ -z "$install_script" ]; then
        log_error "Script d'installation non trouvé pour $brand"
        return 1
    fi
    
    log_info "Exécution de $install_script"
    chmod +x "$install_script"
    "$install_script"
}

# Fonction de diagnostic par marque
diagnose_brand() {
    local brand="$1"
    local brand_dir="$SCRIPT_DIR/brands/$brand"
    
    if [ ! -d "$brand_dir" ]; then
        log_error "Marque '$brand' non supportée"
        return 1
    fi
    
    log_info "Diagnostic pour ${SUPPORTED_BRANDS[$brand]}"
    
    # Chercher le script de diagnostic
    local diagnose_script=""
    for script_name in "diagnose-${brand}.sh" "diagnose.sh"; do
        if [ -f "$brand_dir/$script_name" ]; then
            diagnose_script="$brand_dir/$script_name"
            break
        fi
    done
    
    if [ -z "$diagnose_script" ]; then
        log_error "Script de diagnostic non trouvé pour $brand"
        return 1
    fi
    
    log_info "Exécution de $diagnose_script"
    chmod +x "$diagnose_script"
    "$diagnose_script"
}

# Fonction de test par marque
test_brand() {
    local brand="$1"
    local brand_dir="$SCRIPT_DIR/brands/$brand"
    
    if [ ! -d "$brand_dir" ]; then
        log_error "Marque '$brand' non supportée"
        return 1
    fi
    
    log_info "Test pour ${SUPPORTED_BRANDS[$brand]}"
    
    # Chercher le script de test
    local test_script=""
    for script_name in "test-${brand}.sh" "test.sh"; do
        if [ -f "$brand_dir/$script_name" ]; then
            test_script="$brand_dir/$script_name"
            break
        fi
    done
    
    if [ -n "$test_script" ]; then
        log_info "Exécution de $test_script"
        chmod +x "$test_script"
        "$test_script"
    else
        log_warning "Script de test non trouvé pour $brand"
        # Utiliser le diagnostic comme test
        diagnose_brand "$brand"
    fi
}

# Fonction pour lister les marques
list_brands() {
    log_info "Marques supportées par AirAstro:"
    echo
    for brand in "${!SUPPORTED_BRANDS[@]}"; do
        local brand_dir="$SCRIPT_DIR/brands/$brand"
        if [ -d "$brand_dir" ]; then
            echo "  ✅ $brand - ${SUPPORTED_BRANDS[$brand]}"
            
            # Lister les scripts disponibles
            local scripts=($(find "$brand_dir" -name "*.sh" -type f | sort))
            if [ ${#scripts[@]} -gt 0 ]; then
                echo "     Scripts disponibles:"
                for script in "${scripts[@]}"; do
                    echo "       - $(basename "$script")"
                done
            fi
        else
            echo "  ❌ $brand - ${SUPPORTED_BRANDS[$brand]} (non implémenté)"
        fi
        echo
    done
}

# Fonction principale
main() {
    local command="$1"
    local brand="$2"
    
    case "$command" in
        "install")
            if [ -z "$brand" ]; then
                log_error "Marque requise pour l'installation"
                show_help
                exit 1
            fi
            install_brand "$brand"
            ;;
        "diagnose")
            if [ -z "$brand" ]; then
                log_error "Marque requise pour le diagnostic"
                show_help
                exit 1
            fi
            diagnose_brand "$brand"
            ;;
        "test")
            if [ -z "$brand" ]; then
                log_error "Marque requise pour le test"
                show_help
                exit 1
            fi
            test_brand "$brand"
            ;;
        "list")
            list_brands
            ;;
        "detect")
            detect_equipment
            ;;
        "status")
            show_status
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            if [ -z "$command" ]; then
                show_help
            else
                log_error "Commande inconnue: $command"
                show_help
                exit 1
            fi
            ;;
    esac
}

# Exécution
main "$@"
