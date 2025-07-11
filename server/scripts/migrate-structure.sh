#!/bin/bash
set -e

# Script de migration pour la nouvelle structure des scripts AirAstro
# Crée des liens symboliques pour maintenir la compatibilité

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔄 Migration vers la nouvelle structure des scripts AirAstro"
echo "============================================================"

# Vérifier si nous sommes dans le bon répertoire
if [ ! -d "$SCRIPT_DIR/core" ] || [ ! -d "$SCRIPT_DIR/indi" ]; then
    echo "❌ Erreur: Ce script doit être exécuté depuis le dossier scripts/"
    exit 1
fi

echo "📁 Création des liens symboliques pour la compatibilité..."

# Fonction pour créer un lien symbolique sécurisé
create_link() {
    local source="$1"
    local target="$2"
    
    if [ -f "$SCRIPT_DIR/$source" ] && [ ! -L "$SCRIPT_DIR/$target" ] && [ ! -f "$SCRIPT_DIR/$target" ]; then
        ln -s "$source" "$SCRIPT_DIR/$target"
        echo "  ✅ $target → $source"
    elif [ -L "$SCRIPT_DIR/$target" ]; then
        echo "  ↩️  $target (lien existant)"
    elif [ -f "$SCRIPT_DIR/$target" ]; then
        echo "  ⚠️  $target (fichier existant, non remplacé)"
    else
        echo "  ❌ $target (source non trouvée: $source)"
    fi
}

# Scripts core
echo
echo "🔧 Scripts core..."
create_link "core/airastro-common.sh" "airastro-common.sh"
create_link "core/start-airastro.sh" "start-airastro.sh"
create_link "core/start-server.sh" "start-server.sh"
create_link "core/build-server.sh" "build-server.sh"
create_link "core/airastro-version-manager.sh" "airastro-version-manager.sh"
create_link "core/setup-current-version.sh" "setup-current-version.sh"

# Scripts INDI
echo
echo "📡 Scripts INDI..."
create_link "indi/indi-manager.sh" "indi-manager.sh"
create_link "indi/diagnose-indi-system.sh" "diagnose-indi-system.sh"
create_link "indi/install-indi-drivers.sh" "install-indi-drivers.sh"
create_link "indi/maintain-indi-drivers.sh" "maintain-indi-drivers.sh"
create_link "indi/clean-indi-system.sh" "clean-indi-system.sh"
create_link "indi/startup-drivers.sh" "startup-drivers.sh"

# Scripts d'installation
echo
echo "📦 Scripts d'installation..."
create_link "installation/install-drivers.sh" "install-drivers.sh"
create_link "installation/install-on-rpi.sh" "install-on-rpi.sh"
create_link "installation/install-all-drivers.sh" "install-all-drivers.sh"
create_link "installation/setup-environment.sh" "setup-environment.sh"
create_link "installation/setup-equipment-database.sh" "setup-equipment-database.sh"
create_link "installation/init-airastro-environment.sh" "init-airastro-environment.sh"
create_link "installation/auto-install-asi.sh" "auto-install-asi.sh"
create_link "installation/auto-configure-equipment.sh" "auto-configure-equipment.sh"

# Scripts de diagnostic
echo
echo "🔍 Scripts de diagnostic..."
create_link "diagnostics/debug-airastro.sh" "debug-airastro.sh"
create_link "diagnostics/fix-airastro.sh" "fix-airastro.sh"
create_link "diagnostics/fix-driver-detection.sh" "fix-driver-detection.sh"
create_link "diagnostics/fix-indi-repository.sh" "fix-indi-repository.sh"
create_link "diagnostics/quick-fix.sh" "quick-fix.sh"
create_link "diagnostics/quick-fix-apt-key.sh" "quick-fix-apt-key.sh"
create_link "diagnostics/quick-status.sh" "quick-status.sh"
create_link "diagnostics/status.sh" "status.sh"

# Scripts de test
echo
echo "🧪 Scripts de test..."
create_link "testing/test-equipment-detection.sh" "test-equipment-detection.sh"
create_link "testing/test-equipment-filtering.sh" "test-equipment-filtering.sh"
create_link "testing/test-complete-equipment-system.sh" "test-complete-equipment-system.sh"
create_link "testing/test-environment-setup.sh" "test-environment-setup.sh"
create_link "testing/test-remote-connectivity.sh" "test-remote-connectivity.sh"

# Scripts réseau
echo
echo "🌐 Scripts réseau..."
create_link "networking/configure-mdns.sh" "configure-mdns.sh"
create_link "networking/cleanup-mdns.sh" "cleanup-mdns.sh"
create_link "networking/check-mdns.sh" "check-mdns.sh"
create_link "networking/update-mdns.sh" "update-mdns.sh"

# Scripts de maintenance
echo
echo "🔧 Scripts de maintenance..."
create_link "maintenance/update-airastro-system.sh" "update-airastro-system.sh"
create_link "maintenance/monitor-indi-installation.sh" "monitor-indi-installation.sh"

echo
echo "✅ Migration terminée!"
echo
echo "📋 Résumé:"
echo "- Les scripts ont été organisés dans des dossiers thématiques"
echo "- Des liens symboliques ont été créés pour maintenir la compatibilité"
echo "- Vous pouvez utiliser les anciens chemins ou les nouveaux"
echo
echo "🚀 Nouveaux chemins recommandés:"
echo "- Scripts core: ./core/[script].sh"
echo "- Scripts INDI: ./indi/[script].sh"
echo "- Scripts diagnostic: ./diagnostics/[script].sh"
echo "- Scripts équipements: ./equipment-manager.sh [commande] [marque]"
echo
echo "📖 Documentation:"
echo "- Consultez ./README.md pour la documentation complète"
echo "- Chaque dossier a son propre README.md"
echo
echo "⚠️  Note: Les liens symboliques permettent d'utiliser les anciens chemins"
echo "   mais il est recommandé de migrer vers les nouveaux chemins"

# Créer un script de nettoyage
cat > "$SCRIPT_DIR/cleanup-migration.sh" << 'EOF'
#!/bin/bash
# Script pour nettoyer les liens symboliques de migration

echo "🧹 Nettoyage des liens symboliques de migration..."

# Liste des liens à supprimer
LINKS=(
    "airastro-common.sh"
    "start-airastro.sh"
    "start-server.sh"
    "build-server.sh"
    "airastro-version-manager.sh"
    "setup-current-version.sh"
    "indi-manager.sh"
    "diagnose-indi-system.sh"
    "install-indi-drivers.sh"
    "maintain-indi-drivers.sh"
    "clean-indi-system.sh"
    "startup-drivers.sh"
    "install-drivers.sh"
    "install-on-rpi.sh"
    "install-all-drivers.sh"
    "setup-environment.sh"
    "setup-equipment-database.sh"
    "init-airastro-environment.sh"
    "auto-install-asi.sh"
    "auto-configure-equipment.sh"
    "debug-airastro.sh"
    "fix-airastro.sh"
    "fix-driver-detection.sh"
    "fix-indi-repository.sh"
    "quick-fix.sh"
    "quick-fix-apt-key.sh"
    "quick-status.sh"
    "status.sh"
    "test-equipment-detection.sh"
    "test-equipment-filtering.sh"
    "test-complete-equipment-system.sh"
    "test-environment-setup.sh"
    "test-remote-connectivity.sh"
    "configure-mdns.sh"
    "cleanup-mdns.sh"
    "check-mdns.sh"
    "update-mdns.sh"
    "update-airastro-system.sh"
    "monitor-indi-installation.sh"
)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

for link in "${LINKS[@]}"; do
    if [ -L "$SCRIPT_DIR/$link" ]; then
        rm "$SCRIPT_DIR/$link"
        echo "  ✅ Supprimé: $link"
    fi
done

echo "✅ Nettoyage terminé!"
echo "⚠️  Utilisez maintenant les nouveaux chemins (ex: ./core/start-airastro.sh)"
EOF

chmod +x "$SCRIPT_DIR/cleanup-migration.sh"
echo
echo "🧹 Script de nettoyage créé: ./cleanup-migration.sh"
echo "   Utilisez-le quand vous aurez migré tous vos scripts vers les nouveaux chemins"
