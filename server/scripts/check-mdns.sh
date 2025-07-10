#!/bin/bash
set -e

# Script de vérification et dépannage mDNS pour AirAstro

log() { echo -e "\033[1;32m[mDNS Check]\033[0m $*"; }
warning() { echo -e "\033[1;33m[Warning]\033[0m $*"; }
error() { echo -e "\033[1;31m[Error]\033[0m $*"; }

log "Vérification de la configuration mDNS d'AirAstro"
echo

# Vérification d'Avahi
log "1. État du service Avahi"
if systemctl is-active --quiet avahi-daemon; then
    echo "✅ Service Avahi actif"
    echo "   Version: $(avahi-daemon --version 2>/dev/null | head -n1)"
else
    error "❌ Service Avahi inactif"
    echo "   Pour le redémarrer: sudo systemctl restart avahi-daemon"
fi

# Vérification du hostname
log "2. Configuration du hostname"
CURRENT_HOSTNAME=$(hostname)
if [ "$CURRENT_HOSTNAME" = "airastro" ]; then
    echo "✅ Hostname configuré: $CURRENT_HOSTNAME"
else
    warning "⚠️  Hostname actuel: $CURRENT_HOSTNAME (recommandé: airastro)"
fi

# Vérification du fichier de service Avahi
log "3. Service Avahi AirAstro"
AVAHI_SERVICE="/etc/avahi/services/airastro.service"
if [ -f "$AVAHI_SERVICE" ]; then
    echo "✅ Fichier de service trouvé: $AVAHI_SERVICE"
else
    error "❌ Fichier de service manquant: $AVAHI_SERVICE"
fi

# Test de résolution mDNS
log "4. Test de résolution mDNS"
if command -v avahi-resolve-host-name >/dev/null; then
    if timeout 5 avahi-resolve-host-name airastro.local >/dev/null 2>&1; then
        IP=$(avahi-resolve-host-name airastro.local 2>/dev/null | cut -f2)
        echo "✅ airastro.local résout vers: $IP"
    else
        warning "⚠️  airastro.local ne résout pas"
    fi
    
    if timeout 5 avahi-resolve-host-name $(hostname).local >/dev/null 2>&1; then
        IP=$(avahi-resolve-host-name $(hostname).local 2>/dev/null | cut -f2)
        echo "✅ $(hostname).local résout vers: $IP"
    else
        warning "⚠️  $(hostname).local ne résout pas"
    fi
else
    error "❌ avahi-resolve-host-name non trouvé"
fi

# Vérification des services annoncés
log "5. Services mDNS annoncés"
if command -v avahi-browse >/dev/null; then
    echo "Services HTTP détectés:"
    timeout 3 avahi-browse -t _http._tcp --resolve 2>/dev/null | grep -E "(hostname|address|port)" | head -10 || echo "   Aucun service HTTP détecté"
    
    echo
    echo "Services SSH détectés:"
    timeout 3 avahi-browse -t _ssh._tcp --resolve 2>/dev/null | grep -E "(hostname|address|port)" | head -10 || echo "   Aucun service SSH détecté"
else
    error "❌ avahi-browse non trouvé"
fi

# Vérification de la connectivité réseau
log "6. Connectivité réseau"
INTERFACES=$(ip link show | grep -E "^[0-9]+:" | grep -v "lo:" | cut -d: -f2 | tr -d ' ')
for iface in $INTERFACES; do
    if ip addr show "$iface" | grep -q "inet "; then
        IP=$(ip addr show "$iface" | grep "inet " | head -n1 | awk '{print $2}' | cut -d/ -f1)
        STATE=$(cat "/sys/class/net/$iface/operstate" 2>/dev/null || echo "unknown")
        echo "✅ Interface $iface: $IP (état: $STATE)"
    else
        echo "❌ Interface $iface: pas d'IP"
    fi
done

# Vérification du port 80
log "7. Vérification du service AirAstro"
if ss -tuln | grep -q ":80 "; then
    echo "✅ Port 80 en écoute"
else
    warning "⚠️  Port 80 non en écoute"
    echo "   Vérifiez que le service AirAstro est démarré"
fi

# Test de connectivité HTTP
log "8. Test de connectivité HTTP"
if command -v curl >/dev/null; then
    if curl -s --connect-timeout 3 http://localhost/api/ping >/dev/null 2>&1; then
        echo "✅ Service HTTP local répond"
    else
        warning "⚠️  Service HTTP local ne répond pas"
    fi
    
    if curl -s --connect-timeout 3 http://airastro.local/api/ping >/dev/null 2>&1; then
        echo "✅ Service HTTP via mDNS répond"
    else
        warning "⚠️  Service HTTP via mDNS ne répond pas"
    fi
else
    warning "⚠️  curl non installé, impossible de tester HTTP"
fi

echo
log "Diagnostic terminé"

# Suggestions de dépannage
echo
log "Suggestions de dépannage en cas de problème:"
echo "1. Redémarrer Avahi: sudo systemctl restart avahi-daemon"
echo "2. Reconfigurer mDNS: sudo ./configure-mdns.sh"
echo "3. Redémarrer AirAstro: sudo systemctl restart airastro"
echo "4. Redémarrer le réseau: sudo systemctl restart networking"
echo "5. Redémarrer complètement le système"
