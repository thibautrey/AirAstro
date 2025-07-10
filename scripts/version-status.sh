#!/bin/bash

# Script pour afficher l'état actuel des versions de tous les packages
# Usage: ./scripts/version-status.sh

set -e

echo "🔍 État des versions AirAstro"
echo "============================="
echo ""

check_package_version() {
    local package_name="$1"
    local package_path="$2"
    
    if [ -f "$package_path/package.json" ]; then
        local version=$(jq -r '.version' "$package_path/package.json" 2>/dev/null)
        if [ "$version" != "null" ] && [ "$version" != "" ]; then
            echo "📦 $package_name: v$version"
        else
            echo "❌ $package_name: Version non trouvée"
        fi
    else
        echo "❌ $package_name: package.json non trouvé ($package_path)"
    fi
}

# Vérifier chaque package
check_package_version "Server" "server"
check_package_version "Web App" "apps/web"
check_package_version "Mobile App" "apps/airastro"

echo ""
echo "🏷️  Tags Git récents:"
echo "====================="

# Afficher les derniers tags de version
if git tag -l | grep -E "(server-v|web-v|mobile-v)" > /dev/null 2>&1; then
    git tag -l | grep -E "(server-v|web-v|mobile-v)" | sort -V | tail -10
else
    echo "Aucun tag de version trouvé"
fi

echo ""
echo "📊 Commits récents:"
echo "=================="
git log --oneline -10

echo ""
echo "🔄 Statut Git:"
echo "============="
if git status --porcelain | grep -q .; then
    echo "❗ Changements non commitées détectés:"
    git status --porcelain
else
    echo "✅ Répertoire de travail propre"
fi

echo ""
echo "🌿 Branche actuelle: $(git branch --show-current)"

# Vérifier s'il y a des commits non pushés
if git log origin/$(git branch --show-current)..HEAD --oneline 2>/dev/null | grep -q .; then
    echo "⚠️  Commits locaux non pushés:"
    git log origin/$(git branch --show-current)..HEAD --oneline
else
    echo "✅ Toutes les modifications sont pushées"
fi
