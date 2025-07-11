#!/bin/bash

# Script de test pour vérifier l'initialisation de l'environnement AirAstro

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🧪 Test d'initialisation de l'environnement AirAstro"
echo "================================================"

# Test 1: Vérifier que le script d'initialisation existe
echo "Test 1: Vérification de l'existence du script d'initialisation"
if [ -f "$SCRIPT_DIR/init-airastro-environment.sh" ]; then
    echo "✅ Script d'initialisation trouvé"
else
    echo "❌ Script d'initialisation manquant"
    exit 1
fi

# Test 2: Vérifier que les utilitaires communs existent
echo "Test 2: Vérification des utilitaires communs"
if [ -f "$SCRIPT_DIR/airastro-common.sh" ]; then
    echo "✅ Utilitaires communs trouvés"
else
    echo "❌ Utilitaires communs manquants"
    exit 1
fi

# Test 3: Tester l'initialisation
echo "Test 3: Test de l'initialisation"
if "$SCRIPT_DIR/init-airastro-environment.sh"; then
    echo "✅ Initialisation réussie"
else
    echo "❌ Échec de l'initialisation"
    exit 1
fi

# Test 4: Vérifier que les répertoires ont été créés
echo "Test 4: Vérification des répertoires"
directories=(
    "/opt/airastro"
    "/opt/airastro/versions"
    "/opt/airastro/backups"
    "/opt/airastro/logs"
    "/opt/airastro/config"
)

for dir in "${directories[@]}"; do
    if [ -d "$dir" ]; then
        echo "✅ Répertoire $dir créé"
    else
        echo "❌ Répertoire $dir manquant"
        exit 1
    fi
done

# Test 5: Tester le gestionnaire de versions
echo "Test 5: Test du gestionnaire de versions"
if [ -f "$SCRIPT_DIR/airastro-version-manager.sh" ]; then
    chmod +x "$SCRIPT_DIR/airastro-version-manager.sh"
    if "$SCRIPT_DIR/airastro-version-manager.sh" init; then
        echo "✅ Gestionnaire de versions fonctionnel"
    else
        echo "❌ Problème avec le gestionnaire de versions"
        exit 1
    fi
else
    echo "⚠️  Gestionnaire de versions non trouvé (optionnel)"
fi

echo ""
echo "🎉 Tous les tests sont passés avec succès !"
echo "L'environnement AirAstro est correctement configuré."
echo ""
echo "Répertoires disponibles:"
echo "  - /opt/airastro (base)"
echo "  - /opt/airastro/versions (versions téléchargées)"
echo "  - /opt/airastro/backups (sauvegardes)"
echo "  - /opt/airastro/logs (journaux)"
echo "  - /opt/airastro/config (configuration)"
