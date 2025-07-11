#!/bin/bash

# Script de démarrage intelligent pour AirAstro
# Trouve automatiquement un port disponible et configure l'environnement

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AIRASTRO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SERVER_DIR="$AIRASTRO_DIR/server"

log() { echo -e "\033[1;32m[AirAstro Start]\033[0m $*"; }
warning() { echo -e "\033[1;33m[Warning]\033[0m $*"; }
error() { echo -e "\033[1;31m[Error]\033[0m $*" >&2; }
success() { echo -e "\033[1;32m[Success]\033[0m $*"; }

# Vérification qu'un port est disponible
check_port_available() {
    local port=$1
    ! ss -tuln | grep -q ":$port "
}

# Vérification des permissions de port
check_port_permissions() {
    local port=$1
    
    if [ "$port" -le 1024 ]; then
        # Test simple avec nc
        if command -v nc >/dev/null 2>&1; then
            timeout 2 nc -l "$port" >/dev/null 2>&1
            return $?
        else
            # Fallback: essayer de créer un socket
            node -e "
                const net = require('net');
                const server = net.createServer();
                server.listen($port, () => {
                    server.close();
                    process.exit(0);
                });
                server.on('error', () => process.exit(1));
            " 2>/dev/null
            return $?
        fi
    fi
    return 0
}

# Trouve le meilleur port disponible
find_best_port() {
    local preferred_ports=(80 3000 3001 8080 8000)
    
    for port in "${preferred_ports[@]}"; do
        if check_port_available "$port"; then
            if check_port_permissions "$port"; then
                echo "$port"
                return 0
            else
                log "Port $port disponible mais nécessite des privilèges"
            fi
        else
            log "Port $port déjà utilisé"
        fi
    done
    
    # Chercher un port libre dans la plage 3000-3099
    for port in {3000..3099}; do
        if check_port_available "$port"; then
            echo "$port"
            return 0
        fi
    done
    
    error "Aucun port disponible trouvé"
    return 1
}

# Configuration de l'environnement
setup_environment() {
    local port=$1
    
    log "Configuration de l'environnement pour le port $port"
    
    # Création/mise à jour du fichier .env
    cat > "$SERVER_DIR/.env" <<EOF
# Configuration AirAstro
NODE_ENV=production
PORT=$port

# Logs
LOG_LEVEL=info

# Sécurité
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://airastro.local,http://10.42.0.1

# mDNS
MDNS_SERVICE_NAME=airastro
MDNS_SERVICE_TYPE=http
EOF

    success "✅ Environnement configuré pour le port $port"
}

# Compilation si nécessaire
ensure_built() {
    cd "$SERVER_DIR"
    
    if [ ! -f "dist/index.js" ] || [ "src/index.ts" -nt "dist/index.js" ]; then
        log "Compilation nécessaire"
        
        # Vérification des dépendances
        if [ ! -d "node_modules" ]; then
            log "Installation des dépendances"
            npm install
        fi
        
        # Compilation
        log "Compilation du code TypeScript"
        npm run build || {
            error "Échec de la compilation"
            return 1
        }
    fi
    
    return 0
}

# Démarrage du serveur
start_server() {
    local port=$1
    
    log "Démarrage du serveur sur le port $port"
    
    cd "$SERVER_DIR"
    
    # Démarrage avec gestion des erreurs
    if [ "$1" = "--foreground" ]; then
        # Démarrage en avant-plan
        node dist/index.js
    else
        # Démarrage en arrière-plan
        node dist/index.js &
        local pid=$!
        
        # Attente de démarrage
        sleep 3
        
        if kill -0 $pid 2>/dev/null; then
            success "✅ Serveur démarré avec succès (PID: $pid)"
            
            # Test de connectivité
            if command -v curl >/dev/null 2>&1; then
                if curl -s --connect-timeout 5 "http://localhost:$port/api/ping" >/dev/null; then
                    success "✅ Service HTTP répond correctement"
                else
                    warning "⚠️  Service HTTP ne répond pas encore"
                fi
            fi
            
            echo "$pid" > "$SERVER_DIR/server.pid"
            
            echo
            log "AirAstro est maintenant accessible via:"
            if [ "$port" = "80" ]; then
                log "  - http://localhost"
                log "  - http://airastro.local"
            else
                log "  - http://localhost:$port"
                log "  - http://airastro.local:$port"
            fi
            
            return 0
        else
            error "❌ Échec du démarrage du serveur"
            return 1
        fi
    fi
}

# Fonction principale
main() {
    local port=""
    local foreground=false
    
    # Analyse des arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -p|--port)
                port="$2"
                shift 2
                ;;
            -f|--foreground)
                foreground=true
                shift
                ;;
            -h|--help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  -p, --port PORT      Définir le port (défaut: auto-détection)"
                echo "  -f, --foreground     Démarrer en avant-plan"
                echo "  -h, --help           Afficher cette aide"
                exit 0
                ;;
            *)
                error "Option inconnue: $1"
                exit 1
                ;;
        esac
    done
    
    log "Démarrage intelligent d'AirAstro"
    
    # Recherche du meilleur port si non spécifié
    if [ -z "$port" ]; then
        port=$(find_best_port)
        if [ $? -ne 0 ]; then
            exit 1
        fi
        log "Port sélectionné automatiquement: $port"
    else
        log "Port spécifié: $port"
        
        # Vérification du port spécifié
        if ! check_port_available "$port"; then
            error "Port $port déjà utilisé"
            exit 1
        fi
        
        if ! check_port_permissions "$port"; then
            error "Permissions insuffisantes pour le port $port"
            exit 1
        fi
    fi
    
    # Configuration
    setup_environment "$port"
    
    # Compilation
    if ! ensure_built; then
        exit 1
    fi
    
    # Démarrage
    if [ "$foreground" = true ]; then
        start_server "$port" --foreground
    else
        start_server "$port"
    fi
}

# Exécution si appelé directement
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    main "$@"
fi
