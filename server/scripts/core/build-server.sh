#!/bin/bash
set -e

# Script de build pour AirAstro server
# Compile l'application TypeScript et vérifie les dépendances

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

log() { echo -e "\033[1;32m[Build]\033[0m $*"; }
warning() { echo -e "\033[1;33m[Warning]\033[0m $*"; }
error() { echo -e "\033[1;31m[Error]\033[0m $*" >&2; }
success() { echo -e "\033[1;32m[Success]\033[0m $*"; }

log "Build du serveur AirAstro"
echo "Répertoire: $SERVER_DIR"
echo

cd "$SERVER_DIR"

# 1. Vérification de Node.js
log "1. Vérification de Node.js"
if ! command -v node >/dev/null; then
    error "Node.js n'est pas installé"
    exit 1
fi

NODE_VERSION=$(node --version)
NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d'.' -f1 | tr -d 'v')
log "Node.js version: $NODE_VERSION"

if [ "$NODE_MAJOR" -lt 18 ]; then
    warning "⚠️  Version Node.js ancienne (recommandé: >= 18)"
fi

# 2. Vérification de npm
log "2. Vérification de npm"
if ! command -v npm >/dev/null; then
    error "npm n'est pas installé"
    exit 1
fi

NPM_VERSION=$(npm --version)
log "npm version: $NPM_VERSION"

# 3. Installation des dépendances
log "3. Installation des dépendances"
if [ ! -f "package.json" ]; then
    error "package.json non trouvé"
    exit 1
fi

if [ ! -d "node_modules" ]; then
    log "Installation des dépendances..."
    npm install
else
    log "Mise à jour des dépendances..."
    npm update
fi

# 4. Vérification des dépendances critiques
log "4. Vérification des dépendances critiques"
CRITICAL_DEPS=("express" "bonjour" "cors" "typescript" "@types/node")

for dep in "${CRITICAL_DEPS[@]}"; do
    if npm list "$dep" >/dev/null 2>&1; then
        log "✅ $dep installé"
    else
        warning "⚠️  $dep manquant, installation..."
        if [ "$dep" = "typescript" ] || [ "$dep" = "@types/node" ]; then
            npm install -D "$dep"
        else
            npm install "$dep"
        fi
    fi
done

# 5. Nettoyage du répertoire dist
log "5. Nettoyage du répertoire dist"
if [ -d "dist" ]; then
    rm -rf dist
    log "Répertoire dist nettoyé"
fi

# 6. Compilation TypeScript
log "6. Compilation TypeScript"
if [ -f "tsconfig.json" ]; then
    log "Compilation avec TypeScript..."
    
    # Vérification du compilateur TypeScript
    if npm list typescript >/dev/null 2>&1; then
        npx tsc
    else
        error "TypeScript non installé"
        exit 1
    fi
    
    if [ -f "dist/index.js" ]; then
        success "✅ Compilation réussie"
    else
        error "❌ Échec de la compilation TypeScript"
        exit 1
    fi
else
    error "tsconfig.json non trouvé"
    exit 1
fi

# 7. Vérification du fichier principal
log "7. Vérification du fichier principal"
if [ -f "dist/index.js" ]; then
    SIZE=$(stat -c%s "dist/index.js" 2>/dev/null || stat -f%z "dist/index.js" 2>/dev/null)
    log "Fichier principal: dist/index.js (taille: $SIZE octets)"
    
    # Test syntaxique
    if node -c "dist/index.js" >/dev/null 2>&1; then
        success "✅ Syntaxe JavaScript valide"
    else
        error "❌ Erreur de syntaxe JavaScript"
        exit 1
    fi
else
    error "❌ Fichier principal non généré"
    exit 1
fi

# 8. Test de démarrage rapide
log "8. Test de démarrage rapide"
timeout 5 node dist/index.js >/dev/null 2>&1 &
TEST_PID=$!
sleep 2

if kill -0 $TEST_PID 2>/dev/null; then
    success "✅ Application démarre correctement"
    kill $TEST_PID 2>/dev/null || true
    wait $TEST_PID 2>/dev/null || true
else
    error "❌ Application ne démarre pas"
    echo "Tentative de démarrage avec logs d'erreur:"
    timeout 3 node dist/index.js 2>&1 | head -10
    exit 1
fi

# 9. Vérification des fichiers de routes
log "9. Vérification des fichiers de routes"
ROUTE_FILES=("routes/image.route.js" "routes/update.route.js")

for route in "${ROUTE_FILES[@]}"; do
    if [ -f "dist/$route" ]; then
        log "✅ $route trouvé"
    else
        warning "⚠️  $route non trouvé"
    fi
done

# 10. Vérification des contrôleurs
log "10. Vérification des contrôleurs"
CONTROLLER_FILES=("controllers/image.controller.js" "controllers/update.controller.js")

for controller in "${CONTROLLER_FILES[@]}"; do
    if [ -f "dist/$controller" ]; then
        log "✅ $controller trouvé"
    else
        warning "⚠️  $controller non trouvé"
    fi
done

# 11. Résumé
echo
success "🎉 Build terminé avec succès !"
echo
log "Fichiers générés dans dist/:"
find dist -name "*.js" -type f | sed 's/^/  /' | head -10

echo
log "Pour démarrer l'application:"
log "  node dist/index.js"
echo
log "Pour installer comme service système:"
log "  sudo ./fix-airastro.sh"
echo
log "Pour tester la configuration:"
log "  ./check-mdns.sh"
