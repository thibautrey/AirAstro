#!/bin/bash

# Script pour incrémenter manuellement les versions des packages
# Usage: ./scripts/increment-version.sh [server|web|mobile|all] [major|minor|patch]

set -e

PACKAGE=${1:-"all"}
VERSION_TYPE=${2:-"patch"}

increment_version() {
    local package_path=$1
    local version_type=$2
    
    if [ ! -f "$package_path/package.json" ]; then
        echo "❌ package.json not found in $package_path"
        return 1
    fi
    
    cd "$package_path"
    
    CURRENT_VERSION=$(jq -r '.version' package.json)
    echo "📦 Current version in $package_path: $CURRENT_VERSION"
    
    IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_VERSION"
    MAJOR=${VERSION_PARTS[0]}
    MINOR=${VERSION_PARTS[1]}
    PATCH=${VERSION_PARTS[2]}
    
    case $version_type in
        "major")
            NEW_MAJOR=$((MAJOR + 1))
            NEW_VERSION="$NEW_MAJOR.0.0"
            ;;
        "minor")
            NEW_MINOR=$((MINOR + 1))
            NEW_VERSION="$MAJOR.$NEW_MINOR.0"
            ;;
        "patch")
            NEW_PATCH=$((PATCH + 1))
            NEW_VERSION="$MAJOR.$MINOR.$NEW_PATCH"
            ;;
        *)
            echo "❌ Invalid version type: $version_type (must be major, minor, or patch)"
            return 1
            ;;
    esac
    
    echo "🔄 Updating to version: $NEW_VERSION"
    
    # Update package.json
    jq ".version = \"$NEW_VERSION\"" package.json > package.json.tmp && mv package.json.tmp package.json
    
    echo "✅ Version updated in $package_path"
    cd - > /dev/null
}

echo "🚀 Starting version increment process..."
echo "Package: $PACKAGE"
echo "Version type: $VERSION_TYPE"
echo ""

case $PACKAGE in
    "server")
        increment_version "server" "$VERSION_TYPE"
        ;;
    "web")
        increment_version "apps/web" "$VERSION_TYPE"
        ;;
    "mobile")
        increment_version "apps/airastro" "$VERSION_TYPE"
        ;;
    "all")
        increment_version "server" "$VERSION_TYPE"
        increment_version "apps/web" "$VERSION_TYPE"
        increment_version "apps/airastro" "$VERSION_TYPE"
        ;;
    *)
        echo "❌ Invalid package: $PACKAGE (must be server, web, mobile, or all)"
        exit 1
        ;;
esac

echo ""
echo "🎉 Version increment completed!"
echo "💡 Don't forget to commit and push your changes:"
echo "   git add ."
echo "   git commit -m \"chore: increment version(s)\""
echo "   git push"
