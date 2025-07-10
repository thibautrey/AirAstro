#!/bin/bash

# Script de test pour le système de détection d'équipements AirAstro

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_URL="http://localhost:3000"
TEST_RESULTS_DIR="/tmp/airastro-tests"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Fonctions utilitaires
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

# Créer le répertoire de résultats
mkdir -p "$TEST_RESULTS_DIR"

# Fonction pour tester une API
test_api() {
    local endpoint="$1"
    local method="${2:-GET}"
    local data="${3:-}"
    local expected_code="${4:-200}"

    log_info "Test API: $method $endpoint"

    local curl_cmd="curl -s -w '%{http_code}' -o /tmp/response.json"

    if [[ "$method" == "POST" ]]; then
        curl_cmd="$curl_cmd -X POST -H 'Content-Type: application/json'"
        if [[ -n "$data" ]]; then
            curl_cmd="$curl_cmd -d '$data'"
        fi
    fi

    curl_cmd="$curl_cmd $SERVER_URL$endpoint"

    local response_code
    response_code=$(eval "$curl_cmd")

    if [[ "$response_code" == "$expected_code" ]]; then
        log_success "✅ API $endpoint: $response_code"
        return 0
    else
        log_error "❌ API $endpoint: Attendu $expected_code, reçu $response_code"
        return 1
    fi
}

# Fonction pour tester la détection USB
test_usb_detection() {
    log_info "Test de détection USB..."

    # Vérifier si lsusb est disponible
    if ! command -v lsusb > /dev/null 2>&1; then
        log_warning "lsusb non disponible, test ignoré"
        return 0
    fi

    # Compter les appareils USB
    local usb_count
    usb_count=$(lsusb 2>/dev/null | wc -l)

    log_info "Appareils USB détectés: $usb_count"

    if [[ "$usb_count" -gt 0 ]]; then
        log_success "✅ Détection USB fonctionnelle"
        return 0
    else
        log_warning "⚠️ Aucun appareil USB détecté"
        return 1
    fi
}

# Fonction pour tester les drivers INDI
test_indi_drivers() {
    log_info "Test des drivers INDI..."

    # Compter les drivers installés
    local driver_count
    driver_count=$(dpkg -l 2>/dev/null | grep -E "^ii\s+indi-" | wc -l)

    log_info "Drivers INDI installés: $driver_count"

    if [[ "$driver_count" -gt 0 ]]; then
        log_success "✅ Drivers INDI trouvés"
        return 0
    else
        log_warning "⚠️ Aucun driver INDI installé"
        return 1
    fi
}

# Fonction pour tester les permissions
test_permissions() {
    log_info "Test des permissions..."

    # Vérifier si l'utilisateur est dans les groupes nécessaires
    local user_groups
    user_groups=$(groups)

    local required_groups=("dialout" "indi")
    local missing_groups=()

    for group in "${required_groups[@]}"; do
        if ! echo "$user_groups" | grep -q "$group"; then
            missing_groups+=("$group")
        fi
    done

    if [[ ${#missing_groups[@]} -eq 0 ]]; then
        log_success "✅ Permissions correctes"
        return 0
    else
        log_warning "⚠️ Groupes manquants: ${missing_groups[*]}"
        return 1
    fi
}

# Fonction pour tester le serveur
test_server() {
    log_info "Test du serveur AirAstro..."

    # Vérifier si le serveur répond
    if curl -s "$SERVER_URL/api/ping" > /dev/null 2>&1; then
        log_success "✅ Serveur accessible"
        return 0
    else
        log_error "❌ Serveur inaccessible"
        return 1
    fi
}

# Fonction pour tester les API d'équipement
test_equipment_apis() {
    log_info "Test des API d'équipement..."

    local apis=(
        "/api/equipment"
        "/api/equipment/status"
        "/api/equipment/types"
        "/api/equipment/manufacturers"
        "/api/equipment/system-status"
    )

    local success_count=0

    for api in "${apis[@]}"; do
        if test_api "$api"; then
            ((success_count++))
        fi
    done

    log_info "APIs testées: $success_count/${#apis[@]}"

    if [[ $success_count -eq ${#apis[@]} ]]; then
        log_success "✅ Toutes les API d'équipement fonctionnent"
        return 0
    else
        log_error "❌ Certaines API d'équipement ne fonctionnent pas"
        return 1
    fi
}

# Fonction pour tester le scan d'équipement
test_equipment_scan() {
    log_info "Test du scan d'équipement..."

    if test_api "/api/equipment/scan" "POST"; then
        log_success "✅ Scan d'équipement fonctionnel"
        return 0
    else
        log_error "❌ Scan d'équipement non fonctionnel"
        return 1
    fi
}

# Fonction pour générer un rapport
generate_report() {
    local report_file="$TEST_RESULTS_DIR/test_report_$TIMESTAMP.json"

    log_info "Génération du rapport: $report_file"

    cat > "$report_file" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "test_results": {
    "server_accessible": $server_test_result,
    "usb_detection": $usb_test_result,
    "indi_drivers": $indi_test_result,
    "permissions": $permissions_test_result,
    "equipment_apis": $apis_test_result,
    "equipment_scan": $scan_test_result
  },
  "summary": {
    "total_tests": $total_tests,
    "passed_tests": $passed_tests,
    "failed_tests": $failed_tests,
    "success_rate": $((passed_tests * 100 / total_tests))
  }
}
EOF

    log_success "Rapport généré: $report_file"
}

# Fonction principale
main() {
    log_info "=== Test du système de détection d'équipements AirAstro ==="
    log_info "Timestamp: $TIMESTAMP"

    # Initialiser les compteurs
    local total_tests=0
    local passed_tests=0
    local failed_tests=0

    # Tests
    local server_test_result=false
    local usb_test_result=false
    local indi_test_result=false
    local permissions_test_result=false
    local apis_test_result=false
    local scan_test_result=false

    # Test 1: Serveur
    ((total_tests++))
    if test_server; then
        server_test_result=true
        ((passed_tests++))
    else
        ((failed_tests++))
    fi

    # Test 2: Détection USB
    ((total_tests++))
    if test_usb_detection; then
        usb_test_result=true
        ((passed_tests++))
    else
        ((failed_tests++))
    fi

    # Test 3: Drivers INDI
    ((total_tests++))
    if test_indi_drivers; then
        indi_test_result=true
        ((passed_tests++))
    else
        ((failed_tests++))
    fi

    # Test 4: Permissions
    ((total_tests++))
    if test_permissions; then
        permissions_test_result=true
        ((passed_tests++))
    else
        ((failed_tests++))
    fi

    # Test 5: API d'équipement (seulement si le serveur est accessible)
    ((total_tests++))
    if [[ $server_test_result == true ]] && test_equipment_apis; then
        apis_test_result=true
        ((passed_tests++))
    else
        ((failed_tests++))
    fi

    # Test 6: Scan d'équipement (seulement si le serveur est accessible)
    ((total_tests++))
    if [[ $server_test_result == true ]] && test_equipment_scan; then
        scan_test_result=true
        ((passed_tests++))
    else
        ((failed_tests++))
    fi

    # Génération du rapport
    generate_report

    # Résumé
    log_info "=== Résumé des tests ==="
    log_info "Tests totaux: $total_tests"
    log_info "Tests réussis: $passed_tests"
    log_info "Tests échoués: $failed_tests"
    log_info "Taux de réussite: $((passed_tests * 100 / total_tests))%"

    if [[ $failed_tests -eq 0 ]]; then
        log_success "🎉 Tous les tests sont passés!"
        exit 0
    else
        log_error "❌ $failed_tests test(s) ont échoué"
        exit 1
    fi
}

# Vérifier les arguments
if [[ "$1" == "--help" ]] || [[ "$1" == "-h" ]]; then
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Afficher cette aide"
    echo "  --server-url   URL du serveur (défaut: $SERVER_URL)"
    echo ""
    echo "Exemples:"
    echo "  $0                                    # Test avec les paramètres par défaut"
    echo "  $0 --server-url http://airastro.local:3000  # Test avec un serveur spécifique"
    exit 0
fi

# Traiter les arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --server-url)
            SERVER_URL="$2"
            shift 2
            ;;
        *)
            log_error "Argument inconnu: $1"
            exit 1
            ;;
    esac
done

# Exécuter les tests
main "$@"
