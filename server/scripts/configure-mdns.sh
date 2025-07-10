#!/bin/bash
set -e

# Configuration mDNS/Avahi pour AirAstro
# Ce script configure la découverte de service au niveau système

AVAHI_SERVICE_DIR="/etc/avahi/services"
AIRASTRO_SERVICE="$AVAHI_SERVICE_DIR/airastro.service"
HOSTNAME_CONFIG="/etc/hostname"
HOSTS_CONFIG="/etc/hosts"

log() { echo -e "\033[1;32m[mDNS Config]\033[0m $*"; }
error() { echo -e "\033[1;31m[Error]\033[0m $*" >&2; }

if [ "$(id -u)" -ne 0 ] && ! command -v sudo >/dev/null; then
  echo "Ce script nécessite les privilèges root ou sudo" >&2
  exit 1
fi

run() { if [ "$(id -u)" -eq 0 ]; then bash -c "$*"; else sudo bash -c "$*"; fi }

log "Installation d'Avahi pour la découverte de service mDNS"

# Installation des paquets Avahi
run "apt-get update -y"
run "apt-get install -y avahi-daemon avahi-utils libnss-mdns"

log "Configuration du hostname airastro.local"

# Configuration du hostname
if ! grep -q "airastro" "$HOSTNAME_CONFIG" 2>/dev/null; then
    log "Définition du hostname à 'airastro'"
    run "echo 'airastro' > $HOSTNAME_CONFIG"
    run "hostnamectl set-hostname airastro"
fi

# Mise à jour du fichier hosts
if ! grep -q "airastro.local" "$HOSTS_CONFIG" 2>/dev/null; then
    log "Ajout d'airastro.local au fichier hosts"
    run "sed -i '/127.0.1.1/c\127.0.1.1\tairastro.local airastro' $HOSTS_CONFIG"
fi

log "Configuration du service Avahi pour AirAstro"

# Création du répertoire des services Avahi s'il n'existe pas
run "mkdir -p $AVAHI_SERVICE_DIR"

# Création du fichier de service Avahi
tmpfile=$(mktemp)
cat <<AVAHI_SERVICE > "$tmpfile"
<?xml version="1.0" standalone='no'?><!--*-nxml-*-->
<!DOCTYPE service-group SYSTEM "avahi-service.dtd">

<!--
Service de découverte AirAstro
Ce fichier configure l'annonce mDNS au niveau système
pour permettre la découverte automatique d'AirAstro sur le réseau
-->

<service-group>
  <name replace-wildcards="yes">AirAstro sur %h</name>

  <!-- Service HTTP principal -->
  <service>
    <type>_http._tcp</type>
    <port>80</port>
    <txt-record>description=Serveur d'Astronomie AirAstro</txt-record>
    <txt-record>version=0.0.1</txt-record>
    <txt-record>path=/</txt-record>
    <txt-record>interface=web</txt-record>
  </service>

  <!-- Service SSH pour la maintenance -->
  <service>
    <type>_ssh._tcp</type>
    <port>22</port>
    <txt-record>description=SSH AirAstro</txt-record>
  </service>

  <!-- Service de développement (si port 3000 est utilisé) -->
  <service>
    <type>_http._tcp</type>
    <port>3000</port>
    <txt-record>description=AirAstro Dev Server</txt-record>
    <txt-record>path=/</txt-record>
    <txt-record>interface=dev</txt-record>
  </service>
</service-group>
AVAHI_SERVICE

run "mv $tmpfile $AIRASTRO_SERVICE"
run "chmod 644 $AIRASTRO_SERVICE"

log "Configuration d'Avahi"

# Configuration principale d'Avahi
AVAHI_CONFIG="/etc/avahi/avahi-daemon.conf"
if [ -f "$AVAHI_CONFIG" ]; then
    # Sauvegarde de la configuration originale
    run "cp $AVAHI_CONFIG $AVAHI_CONFIG.backup.$(date +%Y%m%d_%H%M%S)"

    # Configuration optimisée pour AirAstro
    tmpconfig=$(mktemp)
    cat <<AVAHI_CONF > "$tmpconfig"
[server]
host-name=airastro
domain-name=local
browse-domains=local
use-ipv4=yes
use-ipv6=yes
allow-interfaces=wlan0,eth0
deny-interfaces=lo
check-response-ttl=no
use-iff-running=no
enable-dbus=yes
disallow-other-stacks=no
allow-point-to-point=no
cache-entries-max=4096
clients-max=1024
objects-per-client-max=1024
entries-per-entry-group-max=32
ratelimit-interval-usec=1000000
ratelimit-burst=1000

[wide-area]
enable-wide-area=yes

[publish]
disable-publishing=no
disable-user-service-publishing=no
add-service-cookie=no
publish-addresses=yes
publish-hinfo=yes
publish-workstation=yes
publish-domain=yes
publish-dns-servers=no
publish-resolv-conf-dns-servers=no
publish-aaaa-on-ipv4=yes
publish-a-on-ipv6=no

[reflector]
enable-reflector=no
reflect-ipv=no

[rlimits]
#rlimit-as=
rlimit-core=0
rlimit-data=4194304
rlimit-fsize=0
rlimit-nofile=768
rlimit-stack=4194304
rlimit-nproc=3
AVAHI_CONF

    run "mv $tmpconfig $AVAHI_CONFIG"
    run "chmod 644 $AVAHI_CONFIG"
fi

log "Activation et démarrage d'Avahi"

# Activation des services
run "systemctl enable avahi-daemon"
run "systemctl restart avahi-daemon"

# Vérification que le service fonctionne
sleep 2
if run "systemctl is-active --quiet avahi-daemon"; then
    log "✅ Service Avahi démarré avec succès"
else
    error "❌ Échec du démarrage d'Avahi"
    exit 1
fi

log "Test de la résolution mDNS"

# Test de résolution
if command -v avahi-resolve-host-name >/dev/null; then
    sleep 3
    if timeout 10 avahi-resolve-host-name airastro.local >/dev/null 2>&1; then
        log "✅ Résolution mDNS fonctionnelle"
        IP=$(avahi-resolve-host-name airastro.local 2>/dev/null | cut -f2)
        log "   airastro.local résout vers: $IP"
    else
        log "⚠️  Résolution mDNS en cours de configuration..."
    fi
fi

log "Configuration mDNS terminée!"
log ""
log "Les services suivants sont maintenant annoncés:"
log "  - http://airastro.local (port 80) - Interface web principale"
log "  - http://airastro.local:3000 (port 3000) - Serveur de développement"
log "  - ssh://airastro.local (port 22) - Accès SSH"
log ""
log "Redémarrage recommandé pour appliquer toutes les modifications."
