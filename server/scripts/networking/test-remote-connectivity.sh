#!/bin/bash
set -e

# Script de diagnostic mDNS à distance pour AirAstro
# Ce script peut être exécuté depuis un autre appareil pour tester la connectivité

TARGET_HOST="${1:-airastro.local}"
TIMEOUT=10

log() { echo -e "\033[1;32m[Remote Test]\033[0m $*"; }
warning() { echo -e "\033[1;33m[Warning]\033[0m $*"; }
error() { echo -e "\033[1;31m[Error]\033[0m $*"; }
success() { echo -e "\033[1;32m[Success]\033[0m $*"; }

log "Test de connectivité à AirAstro : $TARGET_HOST"
echo

# Test 1: Résolution DNS/mDNS
log "1. Test de résolution DNS/mDNS"
if command -v dig >/dev/null; then
    IP=$(timeout $TIMEOUT dig +short "$TARGET_HOST" 2>/dev/null | head -n1)
    if [ -n "$IP" ]; then
        success "✅ $TARGET_HOST résout vers $IP"
    else
        error "❌ Impossible de résoudre $TARGET_HOST"
        exit 1
    fi
elif command -v nslookup >/dev/null; then
    if timeout $TIMEOUT nslookup "$TARGET_HOST" >/dev/null 2>&1; then
        IP=$(nslookup "$TARGET_HOST" 2>/dev/null | grep -A1 "Name:" | grep "Address:" | cut -d' ' -f2)
        success "✅ $TARGET_HOST résout vers $IP"
    else
        error "❌ Impossible de résoudre $TARGET_HOST"
        exit 1
    fi
else
    warning "⚠️  Aucun outil de résolution DNS disponible"
fi

# Test 2: Ping
log "2. Test de ping"
if command -v ping >/dev/null; then
    if ping -c 1 -W $TIMEOUT "$TARGET_HOST" >/dev/null 2>&1; then
        success "✅ $TARGET_HOST répond au ping"
    else
        error "❌ $TARGET_HOST ne répond pas au ping"
        exit 1
    fi
else
    warning "⚠️  Commande ping non disponible"
fi

# Test 3: Connectivité HTTP
log "3. Test de connectivité HTTP"
if command -v curl >/dev/null; then
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout $TIMEOUT "http://$TARGET_HOST/api/ping" 2>/dev/null)
    if [ "$HTTP_STATUS" = "200" ]; then
        success "✅ Service HTTP AirAstro répond (200 OK)"
    else
        error "❌ Service HTTP AirAstro ne répond pas (code: $HTTP_STATUS)"
        exit 1
    fi
elif command -v wget >/dev/null; then
    if timeout $TIMEOUT wget -q --spider "http://$TARGET_HOST/api/ping" 2>/dev/null; then
        success "✅ Service HTTP AirAstro répond"
    else
        error "❌ Service HTTP AirAstro ne répond pas"
        exit 1
    fi
else
    warning "⚠️  Aucun outil HTTP disponible (curl/wget)"
fi

# Test 4: Test de l'interface web
log "4. Test de l'interface web"
if command -v curl >/dev/null; then
    CONTENT=$(curl -s --connect-timeout $TIMEOUT "http://$TARGET_HOST/" 2>/dev/null | head -c 100)
    if echo "$CONTENT" | grep -qi "airastro\|html\|<!DOCTYPE"; then
        success "✅ Interface web AirAstro disponible"
    else
        warning "⚠️  Interface web pourrait ne pas être disponible"
    fi
fi

# Test 5: Découverte de services mDNS (si disponible)
log "5. Test de découverte de services mDNS"
if command -v avahi-browse >/dev/null; then
    success "✅ avahi-browse disponible"
    log "   Services HTTP découverts :"
    timeout 3 avahi-browse -t _http._tcp --resolve 2>/dev/null | grep -E "(hostname|address|port)" | head -5 || echo "   Aucun service trouvé"
elif command -v dns-sd >/dev/null; then
    success "✅ dns-sd disponible (macOS/iOS)"
    log "   Services HTTP découverts :"
    timeout 3 dns-sd -B _http._tcp 2>/dev/null | head -5 || echo "   Aucun service trouvé"
else
    warning "⚠️  Aucun outil de découverte mDNS disponible"
fi

# Test 6: Informations système (si SSH disponible)
log "6. Test de connectivité SSH (optionnel)"
if command -v ssh >/dev/null; then
    if timeout 3 ssh -o BatchMode=yes -o ConnectTimeout=3 "$TARGET_HOST" 'echo test' >/dev/null 2>&1; then
        success "✅ SSH disponible sur $TARGET_HOST"
    else
        warning "⚠️  SSH non disponible ou non configuré"
    fi
fi

echo
success "🎉 Tous les tests de connectivité sont réussis !"
echo
log "AirAstro est accessible via :"
log "  - Interface web : http://$TARGET_HOST"
log "  - API REST : http://$TARGET_HOST/api/"
log "  - Ping d'état : http://$TARGET_HOST/api/ping"
echo
log "Pour plus d'informations, consultez la documentation :"
log "  http://$TARGET_HOST/docs (si disponible)"
