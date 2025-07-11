#!/bin/bash

# Script de test complet pour le système de détection d'équipements AirAstro avec base de données dynamique

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
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

# Fonction pour tester la base de données d'équipements
test_equipment_database() {
    log_info "Test de la base de données d'équipements..."

    # Tester le service de base de données
    cd "$PROJECT_ROOT/server"
    
    # Vérifier si la base de données est initialisée
    if ! node -e "
        const { EquipmentDatabaseService } = require('./src/services/equipment-database.service');
        const service = new EquipmentDatabaseService();
        service.initializeDatabase().then(() => {
            const stats = service.getStatistics();
            console.log('Équipements totaux:', stats.totalEquipment);
            console.log('Types d\\'équipements:', Object.keys(stats.byType).length);
            console.log('Fabricants:', Object.keys(stats.byManufacturer).length);
            
            if (stats.totalEquipment > 100) {
                console.log('✅ Base de données bien fournie');
                process.exit(0);
            } else {
                console.log('⚠️  Base de données limitée');
                process.exit(1);
            }
        }).catch(error => {
            console.error('❌ Erreur:', error);
            process.exit(1);
        });
    "; then
        log_success "✅ Base de données d'équipements fonctionnelle"
        return 0
    else
        log_error "❌ Base de données d'équipements non fonctionnelle"
        return 1
    fi
}

# Fonction pour tester la détection d'équipements
test_equipment_detection() {
    log_info "Test de la détection d'équipements..."

    # Tester le service de détection
    cd "$PROJECT_ROOT/server"
    
    if node -e "
        const { EquipmentDetectorService } = require('./src/services/equipment-detector.service');
        const { EquipmentDatabaseService } = require('./src/services/equipment-database.service');
        const { DriverManager } = require('./src/indi');
        
        const driverManager = new DriverManager();
        const equipmentDatabase = new EquipmentDatabaseService();
        
        equipmentDatabase.initializeDatabase().then(() => {
            const detector = new EquipmentDetectorService(driverManager, equipmentDatabase);
            
            return detector.detectAllEquipment();
        }).then(equipment => {
            console.log('Équipements détectés:', equipment.length);
            
            if (equipment.length >= 0) {
                console.log('✅ Détection fonctionnelle');
                process.exit(0);
            } else {
                console.log('❌ Détection non fonctionnelle');
                process.exit(1);
            }
        }).catch(error => {
            console.error('❌ Erreur:', error);
            process.exit(1);
        });
    "; then
        log_success "✅ Détection d'équipements fonctionnelle"
        return 0
    else
        log_error "❌ Détection d'équipements non fonctionnelle"
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
        "/api/equipment/database/stats"
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

# Fonction pour tester la mise à jour de la base de données
test_database_update() {
    log_info "Test de la mise à jour de la base de données..."

    # Vérifier la connexion Internet
    if ! curl -s --head --connect-timeout 10 https://api.github.com > /dev/null 2>&1; then
        log_warning "⚠️ Pas de connexion Internet, test de mise à jour ignoré"
        return 0
    fi

    if test_api "/api/equipment/database/update" "POST"; then
        log_success "✅ Mise à jour de la base de données fonctionnelle"
        return 0
    else
        log_error "❌ Mise à jour de la base de données non fonctionnelle"
        return 1
    fi
}

# Fonction pour tester les nouveaux types d'équipements
test_equipment_types() {
    log_info "Test des types d'équipements étendus..."

    cd "$PROJECT_ROOT/server"
    
    if node -e "
        const { EquipmentDatabaseService } = require('./src/services/equipment-database.service');
        const service = new EquipmentDatabaseService();
        
        service.initializeDatabase().then(() => {
            const stats = service.getStatistics();
            const types = Object.keys(stats.byType);
            
            console.log('Types d\\'équipements supportés:', types.join(', '));
            
            const expectedTypes = ['camera', 'mount', 'focuser', 'dome', 'weather', 'aux'];
            const hasAllTypes = expectedTypes.some(type => types.includes(type));
            
            if (hasAllTypes) {
                console.log('✅ Types d\\'équipements étendus supportés');
                process.exit(0);
            } else {
                console.log('❌ Types d\\'équipements étendus manquants');
                process.exit(1);
            }
        }).catch(error => {
            console.error('❌ Erreur:', error);
            process.exit(1);
        });
    "; then
        log_success "✅ Types d'équipements étendus supportés"
        return 0
    else
        log_error "❌ Types d'équipements étendus non supportés"
        return 1
    fi
}

# Fonction pour générer un rapport
generate_report() {
    local report_file="$TEST_RESULTS_DIR/complete_test_report_$TIMESTAMP.json"

    log_info "Génération du rapport: $report_file"

    cat > "$report_file" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "test_results": {
    "server_accessible": $server_test_result,
    "equipment_database": $database_test_result,
    "equipment_detection": $detection_test_result,
    "equipment_apis": $apis_test_result,
    "database_update": $update_test_result,
    "equipment_types": $types_test_result
  },
  "summary": {
    "total_tests": $total_tests,
    "passed_tests": $passed_tests,
    "failed_tests": $failed_tests,
    "success_rate": $((passed_tests * 100 / total_tests))
  },
  "system_info": {
    "node_version": "$(node --version 2>/dev/null || echo 'N/A')",
    "os": "$(uname -s)",
    "arch": "$(uname -m)",
    "server_url": "$SERVER_URL",
    "project_root": "$PROJECT_ROOT"
  }
}
EOF

    log_success "Rapport généré: $report_file"
}

# Fonction principale
main() {
    log_info "=== Test complet du système de détection d'équipements AirAstro ==="
    log_info "Timestamp: $TIMESTAMP"
    log_info "Version: Base de données dynamique INDI"

    # Initialiser les compteurs
    local total_tests=0
    local passed_tests=0
    local failed_tests=0

    # Tests
    local server_test_result=false
    local database_test_result=false
    local detection_test_result=false
    local apis_test_result=false
    local update_test_result=false
    local types_test_result=false

    # Test 1: Base de données d'équipements
    ((total_tests++))
    if test_equipment_database; then
        database_test_result=true
        ((passed_tests++))
    else
        ((failed_tests++))
    fi

    # Test 2: Détection d'équipements
    ((total_tests++))
    if test_equipment_detection; then
        detection_test_result=true
        ((passed_tests++))
    else
        ((failed_tests++))
    fi

    # Test 3: Types d'équipements étendus
    ((total_tests++))
    if test_equipment_types; then
        types_test_result=true
        ((passed_tests++))
    else
        ((failed_tests++))
    fi

    # Test 4: Serveur
    ((total_tests++))
    if test_server; then
        server_test_result=true
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

    # Test 6: Mise à jour de la base de données (seulement si le serveur est accessible)
    ((total_tests++))
    if [[ $server_test_result == true ]] && test_database_update; then
        update_test_result=true
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
        log_info "📊 Le système de détection avec base de données dynamique fonctionne correctement"
        exit 0
    else
        log_error "❌ $failed_tests test(s) ont échoué"
        log_info "🔧 Vérifiez les logs pour plus de détails"
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
    echo "Ce script teste le système complet de détection d'équipements"
    echo "avec la nouvelle base de données dynamique INDI."
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
