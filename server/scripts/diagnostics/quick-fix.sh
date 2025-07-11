#!/bin/bash
set -e

# Script de réparation rapide pour AirAstro
# Résout les problèmes les plus courants en quelques étapes

log() { echo -e "\033[1;32m[Quick Fix]\033[0m $*"; }
warning() { echo -e "\033[1;33m[Warning]\033[0m $*"; }
error() { echo -e "\033[1;31m[Error]\033[0m $*" >&2; }
success() { echo -e "\033[1;32m[Success]\033[0m $*"; }

if [ "$(id -u)" -ne 0 ] && ! command -v sudo >/dev/null; then
  echo "Ce script nécessite les privilèges root ou sudo" >&2
  exit 1
fi

run() { if [ "$(id -u)" -eq 0 ]; then bash -c "$*"; else sudo bash -c "$*"; fi }

log "🚀 Réparation rapide d'AirAstro"
echo

# Détection automatique des problèmes et solutions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Problème 1: Service non démarré
log "1. Vérification du service systemd"
if ! run "systemctl is-active --quiet airastro.service"; then
    warning "Service AirAstro non actif"
    
    # Tentative de démarrage simple
    log "Tentative de démarrage du service..."
    if run "systemctl start airastro.service" 2>/dev/null; then
        success "✅ Service démarré"
    else
        log "Échec du démarrage simple, analyse plus approfondie nécessaire"
        
        # Problème 2: Application non compilée
        log "2. Vérification de la compilation"
        if [ ! -f "$SERVER_DIR/dist/index.js" ]; then
            warning "Application non compilée"
            log "Compilation automatique..."
            
            cd "$SERVER_DIR"
            if npm run build 2>/dev/null || npx tsc 2>/dev/null; then
                success "✅ Compilation réussie"
            else
                error "❌ Échec de la compilation"
                log "Utilisation du script de build complet..."
                if [ -f "$SCRIPT_DIR/build-server.sh" ]; then
                    "$SCRIPT_DIR/build-server.sh"
                else
                    error "Script de build non trouvé"
                    exit 1
                fi
            fi
        fi
        
        # Problème 3: Dépendances manquantes
        log "3. Vérification des dépendances"
        cd "$SERVER_DIR"
        if [ ! -d "node_modules" ]; then
            warning "Dépendances manquantes"
            log "Installation des dépendances..."
            npm install
        fi
        
        # Problème 4: Permissions port 80
        log "4. Vérification des permissions"
        TARGET_USER=${SUDO_USER:-$(whoami)}
        if [ "$TARGET_USER" != "root" ]; then
            if ! sudo -u "$TARGET_USER" timeout 2 nc -l 80 >/dev/null 2>&1; then
                log "Configuration des permissions port 80"
                if [ -f "/usr/bin/node" ]; then
                    run "setcap 'cap_net_bind_service=+ep' /usr/bin/node"
                fi
            fi
        fi
        
        # Nouvelle tentative de démarrage
        log "5. Nouvelle tentative de démarrage"
        run "systemctl daemon-reload"
        if run "systemctl start airastro.service"; then
            success "✅ Service démarré après réparation"
        else
            error "❌ Échec persistant"
            log "Logs d'erreur récents:"
            journalctl -u airastro.service -n 5 --no-pager | sed 's/^/   /'
            echo
            error "Utilisation du script de réparation complète requis:"
            error "  sudo ./fix-airastro.sh"
            exit 1
        fi
    fi
else
    success "✅ Service déjà actif"
fi

# Problème 5: Port non en écoute
log "6. Vérification des ports"
sleep 2
if ss -tuln | grep -q ":80\|:3000"; then
    PORT=$(ss -tuln | grep -E ":80|:3000" | head -1 | grep -o ":[0-9]*" | tr -d ':')
    success "✅ Port $PORT en écoute"
else
    warning "⚠️  Aucun port HTTP détecté"
    log "Attente supplémentaire pour le démarrage..."
    sleep 3
    if ss -tuln | grep -q ":80\|:3000"; then
        PORT=$(ss -tuln | grep -E ":80|:3000" | head -1 | grep -o ":[0-9]*" | tr -d ':')
        success "✅ Port $PORT maintenant en écoute"
    else
        warning "⚠️  Service peut nécessiter plus de temps"
    fi
fi

# Problème 6: Test HTTP
log "7. Test de connectivité HTTP"
if command -v curl >/dev/null; then
    sleep 2
    if curl -s --connect-timeout 5 http://localhost/api/ping >/dev/null 2>&1; then
        success "✅ API répond sur port 80"
    elif curl -s --connect-timeout 5 http://localhost:3000/api/ping >/dev/null 2>&1; then
        success "✅ API répond sur port 3000"
    else
        warning "⚠️  API ne répond pas encore"
        log "Cela peut être normal, le service démarre..."
    fi
fi

# Problème 7: mDNS
log "8. Vérification mDNS"
if systemctl is-active --quiet avahi-daemon; then
    success "✅ Avahi actif"
else
    warning "mDNS non actif"
    log "Démarrage d'Avahi..."
    run "systemctl restart avahi-daemon"
fi

echo
success "🎉 Réparation rapide terminée !"
echo

# Résumé final
log "📊 État final:"
if run "systemctl is-active --quiet airastro.service"; then
    success "✅ Service AirAstro: actif"
else
    error "❌ Service AirAstro: inactif"
fi

if systemctl is-active --quiet avahi-daemon; then
    success "✅ Service mDNS: actif"
else
    error "❌ Service mDNS: inactif"
fi

if ss -tuln | grep -q ":80\|:3000"; then
    PORT=$(ss -tuln | grep -E ":80|:3000" | head -1 | grep -o ":[0-9]*" | tr -d ':')
    success "✅ Port HTTP: $PORT en écoute"
else
    warning "⚠️  Port HTTP: non détecté"
fi

echo
log "🔗 Accès AirAstro:"
if ss -tuln | grep -q ":80"; then
    log "  - http://localhost"
    log "  - http://airastro.local"
elif ss -tuln | grep -q ":3000"; then
    log "  - http://localhost:3000"
    log "  - http://airastro.local:3000"
else
    warning "  - Aucun port HTTP détecté"
fi

echo
log "🛠️  Si des problèmes persistent:"
log "  - Diagnostic complet: ./debug-airastro.sh"
log "  - Réparation complète: sudo ./fix-airastro.sh"
log "  - Vérification mDNS: ./check-mdns.sh"
log "  - Logs en temps réel: journalctl -u airastro.service -f"
