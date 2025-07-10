#!/bin/bash
set -e

# Script de réparation automatique pour AirAstro
# Résout les problèmes courants du service

log() { echo -e "\033[1;32m[AirAstro Fix]\033[0m $*"; }
warning() { echo -e "\033[1;33m[Warning]\033[0m $*"; }
error() { echo -e "\033[1;31m[Error]\033[0m $*" >&2; }
success() { echo -e "\033[1;32m[Success]\033[0m $*"; }

if [ "$(id -u)" -ne 0 ] && ! command -v sudo >/dev/null; then
  echo "Ce script nécessite les privilèges root ou sudo" >&2
  exit 1
fi

run() { if [ "$(id -u)" -eq 0 ]; then bash -c "$*"; else sudo bash -c "$*"; fi }

log "Réparation automatique du service AirAstro"
echo

# Détection du répertoire AirAstro
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AIRASTRO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

log "Répertoire AirAstro détecté: $AIRASTRO_DIR"

# Vérification que nous sommes dans le bon répertoire
if [ ! -f "$AIRASTRO_DIR/server/package.json" ]; then
    error "Répertoire AirAstro non valide"
    exit 1
fi

SERVER_DIR="$AIRASTRO_DIR/server"
SERVICE_FILE="/etc/systemd/system/airastro.service"

# 1. Arrêt du service existant
log "1. Arrêt du service existant"
run "systemctl stop airastro.service 2>/dev/null || true"

# 2. Vérification et installation des dépendances
log "2. Vérification des dépendances"
cd "$SERVER_DIR"

if [ ! -d "node_modules" ]; then
    log "Installation des dépendances Node.js"
    npm install
else
    log "Mise à jour des dépendances Node.js"
    npm update
fi

# 3. Compilation de l'application
log "3. Compilation de l'application TypeScript"
if [ -f "tsconfig.json" ]; then
    # Vérification de TypeScript
    if ! npm list typescript >/dev/null 2>&1; then
        log "Installation de TypeScript"
        npm install -D typescript @types/node
    fi

    # Compilation
    log "Compilation du code TypeScript"
    npm run build 2>/dev/null || npx tsc

    if [ -f "dist/index.js" ]; then
        success "✅ Compilation réussie"
    else
        error "❌ Échec de la compilation"
        exit 1
    fi
else
    warning "⚠️  tsconfig.json non trouvé, code JavaScript assumé"
fi

# 4. Test de démarrage rapide
log "4. Test de démarrage de l'application"

# Vérification préalable des permissions de port
DEFAULT_PORT="80"
if [ "$(id -u)" -ne 0 ] && ! sudo -u "${SUDO_USER:-$(whoami)}" timeout 2 nc -l 80 >/dev/null 2>&1; then
    warning "⚠️  Port 80 non accessible sans privilèges, test avec port 3000"
    DEFAULT_PORT="3000"
fi

# Test avec le port approprié
PORT=$DEFAULT_PORT timeout 10 node dist/index.js >/dev/null 2>&1 &
TEST_PID=$!
sleep 3

if kill -0 $TEST_PID 2>/dev/null; then
    success "✅ Application démarre correctement sur le port $DEFAULT_PORT"
    kill $TEST_PID 2>/dev/null || true
else
    error "❌ Application ne démarre pas correctement"
    echo "Logs d'erreur:"
    PORT=$DEFAULT_PORT node dist/index.js 2>&1 | head -10
    exit 1
fi

# 5. Reconfiguration du service systemd
log "5. Configuration du service systemd"
TARGET_USER=${SUDO_USER:-$(whoami)}

tmpfile=$(mktemp)
cat <<SERVICE > "$tmpfile"
[Unit]
Description=AirAstro Astronomy Server
After=network.target
Wants=network.target

[Service]
Type=simple
WorkingDirectory=$SERVER_DIR
ExecStart=/usr/bin/node $SERVER_DIR/dist/index.js
Restart=on-failure
RestartSec=10
User=$TARGET_USER
Group=$TARGET_USER
Environment=NODE_ENV=production
Environment=PORT=$DEFAULT_PORT

# Sécurité
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=$SERVER_DIR
ProtectHome=true

# Logs
StandardOutput=journal
StandardError=journal
SyslogIdentifier=airastro

[Install]
WantedBy=multi-user.target
SERVICE

run "mv $tmpfile $SERVICE_FILE"
run "chmod 644 $SERVICE_FILE"

# 6. Rechargement et activation du service
log "6. Activation du service"
run "systemctl daemon-reload"
run "systemctl enable airastro.service"

# 7. Vérification des permissions
log "7. Vérification des permissions"
if [ "$TARGET_USER" != "root" ]; then
    # Vérification que l'utilisateur peut lier le port 80
    if ! sudo -u "$TARGET_USER" timeout 2 nc -l 80 >/dev/null 2>&1; then
        log "Configuration des permissions pour le port 80"
        # Autoriser les ports privilégiés pour Node.js
        if [ -f "/usr/bin/node" ]; then
            run "setcap 'cap_net_bind_service=+ep' /usr/bin/node"
        fi

        # Alternative: changer le port dans le service
        if ! sudo -u "$TARGET_USER" timeout 2 nc -l 80 >/dev/null 2>&1; then
            warning "⚠️  Port 80 non accessible, utilisation du port 3000"
            run "sed -i 's/Environment=PORT=80/Environment=PORT=3000/' $SERVICE_FILE"
            run "systemctl daemon-reload"
        fi
    fi
fi

# 8. Démarrage du service
log "8. Démarrage du service AirAstro"
run "systemctl start airastro.service"

# 9. Attente de stabilisation
log "9. Attente de stabilisation du service"
sleep 5

# 10. Vérification finale
log "10. Vérification finale"
if run "systemctl is-active --quiet airastro.service"; then
    success "✅ Service AirAstro démarré avec succès"

    # Vérification du port
    PORT=$(grep "Environment=PORT" "$SERVICE_FILE" | cut -d'=' -f3 || echo "80")
    if ss -tuln | grep -q ":$PORT "; then
        success "✅ Port $PORT en écoute"

        # Test HTTP
        sleep 2
        if curl -s --connect-timeout 3 "http://localhost:$PORT/api/ping" >/dev/null 2>&1; then
            success "✅ Service HTTP répond correctement"
        else
            warning "⚠️  Service HTTP ne répond pas encore (peut nécessiter plus de temps)"
        fi
    else
        warning "⚠️  Port $PORT non en écoute"
    fi

    # Logs récents
    echo
    log "Logs récents du service:"
    journalctl -u airastro.service -n 5 --no-pager | sed 's/^/   /'

else
    error "❌ Échec du démarrage du service"
    echo
    error "Logs d'erreur:"
    journalctl -u airastro.service -n 10 --no-pager | sed 's/^/   /'
    exit 1
fi

# 11. Mise à jour de la configuration mDNS si nécessaire
log "11. Mise à jour de la configuration mDNS"
if [ -f "$SCRIPT_DIR/configure-mdns.sh" ]; then
    "$SCRIPT_DIR/configure-mdns.sh" || log "Configuration mDNS ignorée"
fi

echo
success "🎉 Réparation terminée avec succès !"
echo
log "AirAstro est maintenant accessible via:"
PORT=$(grep "Environment=PORT" "$SERVICE_FILE" | cut -d'=' -f3 || echo "80")
if [ "$PORT" = "80" ]; then
    log "  - http://localhost"
    log "  - http://airastro.local"
else
    log "  - http://localhost:$PORT"
    log "  - http://airastro.local:$PORT"
fi
echo
log "Pour surveiller les logs:"
log "  journalctl -u airastro.service -f"
echo
log "Pour redémarrer le service:"
log "  sudo systemctl restart airastro.service"
