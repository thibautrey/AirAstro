#!/bin/bash

# Script de statut AirAstro - Aperçu rapide de l'état du système

success() { echo -e "\033[1;32m✅ $*\033[0m"; }
warning() { echo -e "\033[1;33m⚠️  $*\033[0m"; }
error() { echo -e "\033[1;31m❌ $*\033[0m"; }
info() { echo -e "\033[1;36mℹ️  $*\033[0m"; }

echo -e "\033[1;34m🔭 AirAstro - État du Système\033[0m"
echo "$(date '+%Y-%m-%d %H:%M:%S')"
echo

# Service AirAstro
if systemctl is-active --quiet airastro.service 2>/dev/null; then
    success "Service AirAstro actif"
    UPTIME=$(systemctl show airastro.service -p ActiveEnterTimestamp --value)
    if [ -n "$UPTIME" ]; then
        info "  Démarré: $UPTIME"
    fi
else
    error "Service AirAstro inactif"
fi

# Service mDNS
if systemctl is-active --quiet avahi-daemon 2>/dev/null; then
    success "Service mDNS (Avahi) actif"
else
    error "Service mDNS (Avahi) inactif"
fi

# Ports HTTP
if ss -tuln 2>/dev/null | grep -q ":80 "; then
    success "Port 80 en écoute"
elif ss -tuln 2>/dev/null | grep -q ":3000 "; then
    success "Port 3000 en écoute"
else
    error "Aucun port HTTP en écoute"
fi

# Connectivité HTTP
if command -v curl >/dev/null; then
    if curl -s --connect-timeout 2 http://localhost/api/ping >/dev/null 2>&1; then
        success "API répond (port 80)"
    elif curl -s --connect-timeout 2 http://localhost:3000/api/ping >/dev/null 2>&1; then
        success "API répond (port 3000)"
    else
        error "API ne répond pas"
    fi
fi

# Résolution mDNS
if command -v avahi-resolve-host-name >/dev/null; then
    if timeout 3 avahi-resolve-host-name airastro.local >/dev/null 2>&1; then
        IP=$(avahi-resolve-host-name airastro.local 2>/dev/null | cut -f2)
        success "mDNS résolution: airastro.local → $IP"
    else
        error "mDNS résolution: airastro.local non résolu"
    fi
fi

# Interfaces réseau
echo
info "Interfaces réseau:"
ip addr show | grep -E "^[0-9]+:|inet " | grep -v "127.0.0.1" | while read line; do
    if [[ $line =~ ^[0-9]+: ]]; then
        IFACE=$(echo "$line" | cut -d: -f2 | tr -d ' ')
        echo -n "  $IFACE: "
    elif [[ $line =~ inet ]]; then
        IP=$(echo "$line" | awk '{print $2}' | cut -d/ -f1)
        echo "$IP"
    fi
done

# Processus Node.js
NODE_PROCESSES=$(pgrep -f "node.*airastro\|node.*index.js" 2>/dev/null | wc -l)
if [ "$NODE_PROCESSES" -gt 0 ]; then
    success "$NODE_PROCESSES processus Node.js AirAstro"
else
    error "Aucun processus Node.js AirAstro"
fi

# Utilisation des ressources
echo
info "Utilisation des ressources:"
if [ -f "/proc/loadavg" ]; then
    LOAD=$(cat /proc/loadavg | cut -d' ' -f1)
    info "  Charge système: $LOAD"
fi

if [ -f "/proc/meminfo" ]; then
    MEM_TOTAL=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    MEM_AVAIL=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
    MEM_USED_PCT=$(( (MEM_TOTAL - MEM_AVAIL) * 100 / MEM_TOTAL ))
    info "  Mémoire utilisée: $MEM_USED_PCT%"
fi

if [ -f "/sys/class/thermal/thermal_zone0/temp" ]; then
    TEMP=$(cat /sys/class/thermal/thermal_zone0/temp)
    TEMP_C=$((TEMP / 1000))
    info "  Température CPU: ${TEMP_C}°C"
fi

# Espace disque
DISK_USAGE=$(df -h / 2>/dev/null | tail -1 | awk '{print $5}' | tr -d '%')
if [ -n "$DISK_USAGE" ]; then
    info "  Espace disque utilisé: $DISK_USAGE%"
fi

# Logs récents
echo
info "Logs récents (5 dernières lignes):"
journalctl -u airastro.service -n 5 --no-pager 2>/dev/null | sed 's/^/  /' || echo "  Aucun log disponible"

echo
info "🛠️  Commandes utiles:"
echo "  État détaillé: ./check-mdns.sh"
echo "  Diagnostic: ./debug-airastro.sh"
echo "  Réparation rapide: sudo ./quick-fix.sh"
echo "  Logs temps réel: journalctl -u airastro.service -f"
