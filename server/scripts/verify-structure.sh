#!/bin/bash

# Script de vérification de la nouvelle structure
# Vérifie que tous les scripts sont présents et fonctionnels

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔍 Vérification de la structure des scripts AirAstro"
echo "=================================================="

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Compteurs
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# Fonction de vérification
check_script() {
    local script_path="$1"
    local description="$2"

    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    if [ -f "$SCRIPT_DIR/$script_path" ]; then
        if [ -x "$SCRIPT_DIR/$script_path" ]; then
            echo -e "  ${GREEN}✅${NC} $description"
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
        else
            echo -e "  ${YELLOW}⚠️${NC}  $description (non exécutable)"
            chmod +x "$SCRIPT_DIR/$script_path"
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
        fi
    else
        echo -e "  ${RED}❌${NC} $description (manquant)"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
}

# Fonction de vérification des dossiers
check_directory() {
    local dir_path="$1"
    local description="$2"

    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    if [ -d "$SCRIPT_DIR/$dir_path" ]; then
        echo -e "  ${GREEN}✅${NC} $description"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        echo -e "  ${RED}❌${NC} $description (manquant)"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
}

# Vérification des dossiers
echo
echo "📁 Vérification des dossiers..."
check_directory "core" "Dossier core/"
check_directory "indi" "Dossier indi/"
check_directory "installation" "Dossier installation/"
check_directory "diagnostics" "Dossier diagnostics/"
check_directory "testing" "Dossier testing/"
check_directory "networking" "Dossier networking/"
check_directory "maintenance" "Dossier maintenance/"
check_directory "brands" "Dossier brands/"
check_directory "brands/asi" "Dossier brands/asi/"
check_directory "brands/template" "Dossier brands/template/"

# Vérification des scripts core
echo
echo "🔧 Vérification des scripts core..."
check_script "core/airastro-common.sh" "Fonctions communes"
check_script "core/start-airastro.sh" "Démarrage AirAstro"
check_script "core/start-server.sh" "Démarrage serveur"
check_script "core/build-server.sh" "Construction serveur"
check_script "core/airastro-version-manager.sh" "Gestionnaire de versions"
check_script "core/setup-current-version.sh" "Configuration version"

# Vérification des scripts INDI
echo
echo "📡 Vérification des scripts INDI..."
check_script "indi/indi-manager.sh" "Gestionnaire INDI"
check_script "indi/diagnose-indi-system.sh" "Diagnostic INDI"
check_script "indi/install-indi-drivers.sh" "Installation drivers INDI"
check_script "indi/maintain-indi-drivers.sh" "Maintenance drivers INDI"
check_script "indi/clean-indi-system.sh" "Nettoyage INDI"
check_script "indi/startup-drivers.sh" "Démarrage drivers"

# Vérification des scripts d'installation
echo
echo "📦 Vérification des scripts d'installation..."
check_script "installation/install-drivers.sh" "Installation drivers"
check_script "installation/install-on-rpi.sh" "Installation Raspberry Pi"
check_script "installation/install-all-drivers.sh" "Installation complète"
check_script "installation/setup-environment.sh" "Configuration environnement"
check_script "installation/setup-equipment-database.sh" "Base équipements"
check_script "installation/init-airastro-environment.sh" "Initialisation environnement"
check_script "installation/auto-install-asi.sh" "Auto-installation ASI"
check_script "installation/auto-configure-equipment.sh" "Auto-configuration équipements"

# Vérification des scripts de diagnostic
echo
echo "🔍 Vérification des scripts de diagnostic..."
check_script "diagnostics/debug-airastro.sh" "Debug AirAstro"
check_script "diagnostics/fix-airastro.sh" "Réparation AirAstro"
check_script "diagnostics/fix-driver-detection.sh" "Réparation détection drivers"
check_script "diagnostics/fix-indi-repository.sh" "Réparation dépôts INDI"
check_script "diagnostics/quick-fix.sh" "Réparation rapide"
check_script "diagnostics/quick-fix-apt-key.sh" "Réparation clés APT"
check_script "diagnostics/quick-status.sh" "Statut rapide"
check_script "diagnostics/status.sh" "Statut complet"

# Vérification des scripts de test
echo
echo "🧪 Vérification des scripts de test..."
check_script "testing/test-equipment-detection.sh" "Test détection équipements"
check_script "testing/test-equipment-filtering.sh" "Test filtrage équipements"
check_script "testing/test-complete-equipment-system.sh" "Test système complet"
check_script "testing/test-environment-setup.sh" "Test environnement"
check_script "testing/test-remote-connectivity.sh" "Test connectivité"

# Vérification des scripts réseau
echo
echo "🌐 Vérification des scripts réseau..."
check_script "networking/configure-mdns.sh" "Configuration mDNS"
check_script "networking/cleanup-mdns.sh" "Nettoyage mDNS"
check_script "networking/check-mdns.sh" "Vérification mDNS"
check_script "networking/update-mdns.sh" "Mise à jour mDNS"

# Vérification des scripts de maintenance
echo
echo "🔧 Vérification des scripts de maintenance..."
check_script "maintenance/update-airastro-system.sh" "Mise à jour système"
check_script "maintenance/monitor-indi-installation.sh" "Monitoring INDI"

# Vérification des scripts de marques
echo
echo "🏷️ Vérification des scripts de marques..."
check_script "brands/asi/install-asi-python.sh" "Installation ASI Python"
check_script "brands/asi/install-asi-complete.sh" "Installation ASI complète"
check_script "brands/asi/diagnose-asi.sh" "Diagnostic ASI"
check_script "brands/template/install-template.sh" "Template installation"

# Vérification du gestionnaire d'équipements
echo
echo "⚙️ Vérification du gestionnaire d'équipements..."
check_script "equipment-manager.sh" "Gestionnaire d'équipements"

# Vérification des scripts de migration
echo
echo "🔄 Vérification des scripts de migration..."
check_script "migrate-structure.sh" "Script de migration"

# Vérification des README
echo
echo "📖 Vérification de la documentation..."
check_script "README.md" "Documentation principale"
check_script "core/README.md" "Documentation core"
check_script "indi/README.md" "Documentation INDI"
check_script "diagnostics/README.md" "Documentation diagnostic"
check_script "brands/README.md" "Documentation marques"

# Test rapide des fonctions communes
echo
echo "🧪 Test des fonctions communes..."
if [ -f "$SCRIPT_DIR/core/airastro-common.sh" ]; then
    if source "$SCRIPT_DIR/core/airastro-common.sh" 2>/dev/null; then
        echo -e "  ${GREEN}✅${NC} Fonctions communes chargées"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        echo -e "  ${RED}❌${NC} Erreur dans les fonctions communes"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
fi

# Résumé final
echo
echo "=================================================="
echo "📊 Résumé de la vérification"
echo "=================================================="
echo -e "Total des vérifications: $TOTAL_CHECKS"
echo -e "${GREEN}Réussies: $PASSED_CHECKS${NC}"
echo -e "${RED}Échouées: $FAILED_CHECKS${NC}"

if [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "\n${GREEN}🎉 Tous les tests sont passés avec succès!${NC}"
    echo "La nouvelle structure des scripts est opérationnelle."
else
    echo -e "\n${YELLOW}⚠️ Certaines vérifications ont échoué.${NC}"
    echo "Vérifiez les scripts manquants ou en erreur."
fi

# Conseils d'utilisation
echo
echo "💡 Conseils d'utilisation:"
echo "- Utilisez ./equipment-manager.sh pour gérer les équipements"
echo "- Consultez ./README.md pour la documentation complète"
echo "- Exécutez ./migrate-structure.sh pour créer des liens de compatibilité"
echo "- Utilisez ./core/start-airastro.sh pour démarrer le serveur"

exit $FAILED_CHECKS
