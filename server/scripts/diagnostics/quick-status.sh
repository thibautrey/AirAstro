#!/bin/bash

# Script de vérification rapide de l'état d'installation INDI
# Affiche un résumé concis de l'état actuel

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}📊 ÉTAT RAPIDE DE L'INSTALLATION INDI${NC}"
echo "$(printf '═%.0s' {1..45})"
echo ""

# Vérifier les processus d'installation
if pgrep -f "maintain-indi-drivers.sh\|install-indi-drivers.sh\|apt-get install" > /dev/null 2>&1; then
    echo -e "${GREEN}🔄 Installation en cours${NC}"
    echo "   Processus actifs:"
    pgrep -f "maintain-indi-drivers.sh\|install-indi-drivers.sh\|apt-get install" | while read pid; do
        echo -e "   PID: ${YELLOW}$pid${NC}"
    done
else
    echo -e "${YELLOW}⏸️  Aucune installation active${NC}"
fi

echo ""

# Compter les packages INDI
local installed=$(dpkg -l | grep "^ii.*indi-" 2>/dev/null | wc -l)
local available=$(apt-cache search "^indi-" 2>/dev/null | wc -l)

echo -e "${CYAN}📦 Packages INDI${NC}"
echo -e "   Installés: ${GREEN}$installed${NC}"
echo -e "   Disponibles: ${BLUE}$available${NC}"

if [[ $available -gt 0 ]]; then
    local progress=$((installed * 100 / available))
    echo -e "   Progression: ${CYAN}$progress%${NC}"
fi

echo ""

# Vérifier l'espace disque
local disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
local available_space=$(df -h / | awk 'NR==2 {print $4}')

echo -e "${CYAN}💾 Espace disque${NC}"
if [[ $disk_usage -gt 90 ]]; then
    echo -e "   Utilisation: ${RED}$disk_usage%${NC} - Libre: ${RED}$available_space${NC}"
elif [[ $disk_usage -gt 80 ]]; then
    echo -e "   Utilisation: ${YELLOW}$disk_usage%${NC} - Libre: ${YELLOW}$available_space${NC}"
else
    echo -e "   Utilisation: ${GREEN}$disk_usage%${NC} - Libre: ${GREEN}$available_space${NC}"
fi

echo ""

# Vérifier les erreurs récentes
local recent_errors=0
if [[ -f /var/log/apt/term.log ]]; then
    recent_errors=$(tail -n 20 /var/log/apt/term.log 2>/dev/null | grep -i "error\|failed" | wc -l)
fi

if [[ $recent_errors -gt 0 ]]; then
    echo -e "${RED}⚠️  $recent_errors erreurs récentes détectées${NC}"
else
    echo -e "${GREEN}✅ Aucune erreur récente${NC}"
fi

echo ""

# Derniers packages installés
if [[ $installed -gt 0 ]]; then
    echo -e "${CYAN}📋 Derniers packages installés${NC}"
    dpkg -l | grep "^ii.*indi-" | tail -3 | awk '{print "   ✅ " $2}'
fi

echo ""
echo -e "${YELLOW}💡 Commandes utiles:${NC}"
echo -e "   ${BLUE}./monitor-indi-installation.sh${NC}  - Surveillance complète"
echo -e "   ${BLUE}./indi-manager.sh${NC}               - Menu interactif"
echo -e "   ${BLUE}./quick-status.sh${NC}               - Ce résumé"

echo ""
