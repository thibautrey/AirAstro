#!/bin/bash
set -e

# Script de nettoyage de la configuration mDNS d'AirAstro

log() { echo -e "\033[1;32m[mDNS Cleanup]\033[0m $*"; }
warning() { echo -e "\033[1;33m[Warning]\033[0m $*"; }

if [ "$(id -u)" -ne 0 ] && ! command -v sudo >/dev/null; then
  echo "Ce script nécessite les privilèges root ou sudo" >&2
  exit 1
fi

run() { if [ "$(id -u)" -eq 0 ]; then bash -c "$*"; else sudo bash -c "$*"; fi }

log "Nettoyage de la configuration mDNS d'AirAstro"

# Arrêt d'Avahi
log "Arrêt du service Avahi"
run "systemctl stop avahi-daemon || true"

# Suppression du service AirAstro
AVAHI_SERVICE="/etc/avahi/services/airastro.service"
if [ -f "$AVAHI_SERVICE" ]; then
    log "Suppression du service Avahi AirAstro"
    run "rm -f $AVAHI_SERVICE"
fi

# Restauration de la configuration Avahi originale
AVAHI_CONFIG="/etc/avahi/avahi-daemon.conf"
BACKUP_CONFIG=$(ls "$AVAHI_CONFIG.backup."* 2>/dev/null | tail -n1)
if [ -n "$BACKUP_CONFIG" ] && [ -f "$BACKUP_CONFIG" ]; then
    log "Restauration de la configuration Avahi originale"
    run "cp $BACKUP_CONFIG $AVAHI_CONFIG"
else
    warning "Aucune sauvegarde de configuration trouvée"
fi

# Option pour restaurer le hostname original
echo
if [ "$AUTO_ACCEPT" = "yes" ] || [ "$AIRASTRO_AUTO_INSTALL" = "true" ]; then
    log "Mode auto-acceptation activé, pas de restauration du hostname"
else
    read -p "Voulez-vous restaurer le hostname original ? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Entrez le nouveau hostname (ou appuyez sur Entrée pour 'raspberrypi'): " NEW_HOSTNAME
        NEW_HOSTNAME=${NEW_HOSTNAME:-raspberrypi}
        
        log "Changement du hostname vers: $NEW_HOSTNAME"
        run "echo '$NEW_HOSTNAME' > /etc/hostname"
        run "hostnamectl set-hostname $NEW_HOSTNAME"
        run "sed -i '/127.0.1.1/c\127.0.1.1\t$NEW_HOSTNAME.local $NEW_HOSTNAME' /etc/hosts"
    fi
fi

# Redémarrage d'Avahi
log "Redémarrage du service Avahi"
run "systemctl start avahi-daemon"

log "Nettoyage terminé"
log "Un redémarrage est recommandé pour appliquer tous les changements."
