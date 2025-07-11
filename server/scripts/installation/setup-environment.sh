#!/bin/bash

# Script de configuration d'environnement pour AirAstro
# Permet de définir le port et d'autres variables d'environnement

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AIRASTRO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SERVER_DIR="$AIRASTRO_DIR/server"

log() { echo -e "\033[1;32m[AirAstro Config]\033[0m $*"; }
warning() { echo -e "\033[1;33m[Warning]\033[0m $*"; }
error() { echo -e "\033[1;31m[Error]\033[0m $*" >&2; }
success() { echo -e "\033[1;32m[Success]\033[0m $*"; }

# Vérification des permissions de port
check_port_permissions() {
    local port=$1
    local user=${2:-$(whoami)}
    
    if [ "$port" -le 1024 ]; then
        if [ "$(id -u)" -ne 0 ] && ! sudo -u "$user" timeout 2 nc -l "$port" >/dev/null 2>&1; then
            return 1
        fi
    fi
    return 0
}

# Configuration du port recommandé
get_recommended_port() {
    # Essayer d'abord le port 80
    if check_port_permissions 80; then
        echo "80"
        return 0
    fi
    
    # Sinon, utiliser le port 3000
    echo "3000"
    return 0
}

# Configuration de l'environnement
setup_environment() {
    local port=${1:-$(get_recommended_port)}
    
    log "Configuration de l'environnement AirAstro"
    log "Port configuré: $port"
    
    # Création du fichier .env
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

    success "✅ Fichier .env créé avec le port $port"
    
    # Mise à jour du code pour utiliser le fichier .env
    if [ -f "$SERVER_DIR/src/index.ts" ]; then
        log "Mise à jour du code pour utiliser .env"
        # Vérification si dotenv est installé
        cd "$SERVER_DIR"
        if ! npm list dotenv >/dev/null 2>&1; then
            log "Installation de dotenv"
            npm install dotenv
        fi
        
        # Ajout de l'import dotenv si nécessaire
        if ! grep -q "dotenv" "$SERVER_DIR/src/index.ts"; then
            sed -i '1i import "dotenv/config";' "$SERVER_DIR/src/index.ts"
            log "Import dotenv ajouté"
        fi
    fi
    
    return 0
}

# Fonction principale
main() {
    local port=""
    
    # Analyse des arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -p|--port)
                port="$2"
                shift 2
                ;;
            -h|--help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  -p, --port PORT    Définir le port (défaut: auto-détection)"
                echo "  -h, --help         Afficher cette aide"
                exit 0
                ;;
            *)
                error "Option inconnue: $1"
                exit 1
                ;;
        esac
    done
    
    # Configuration
    setup_environment "$port"
    
    echo
    success "🎉 Configuration terminée !"
    echo
    log "Prochaines étapes:"
    log "  1. Recompiler l'application: npm run build"
    log "  2. Redémarrer le service: sudo systemctl restart airastro.service"
    log "  3. Ou utiliser le script de réparation: ./fix-airastro.sh"
}

# Exécution si appelé directement
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    main "$@"
fi
