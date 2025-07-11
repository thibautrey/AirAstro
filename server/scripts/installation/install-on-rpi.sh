#!/bin/bash
set -e

INSTALL_DIR=${AIRASTRO_DIR:-$HOME/AirAstro}
REPO_URL="https://github.com/thibautrey/AirAstro.git"
BRANCH="main"

log() { echo -e "\033[1;32m[AirAstro]\033[0m $*"; }
error() { echo -e "\033[1;31m[Error]\033[0m $*" >&2; }

if [ "$(id -u)" -ne 0 ] && ! command -v sudo >/dev/null; then
  echo "This script requires root privileges or sudo" >&2
  exit 1
fi

run() { if [ "$(id -u)" -eq 0 ]; then bash -c "$*"; else sudo bash -c "$*"; fi }

log "Updating package lists"
run "apt-get update -y"
run "apt-get install -y git curl build-essential"

if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1 | tr -d 'v')" -lt 20 ]; then
  log "Installing Node.js 20"
  run "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -"
  run "apt-get install -y nodejs"
fi

if [ -d "$INSTALL_DIR/.git" ]; then
  log "Updating existing AirAstro repository"
  git -C "$INSTALL_DIR" pull --ff-only || { error "Failed to update repository"; exit 1; }
else
  log "Cloning AirAstro repository to $INSTALL_DIR"
  git clone "$REPO_URL" "$INSTALL_DIR" || { error "Failed to clone repository"; exit 1; }
fi

cd "$INSTALL_DIR/server"

log "Cleaning previous node_modules to ensure fresh install"
rm -rf node_modules package-lock.json

log "Installing all dependencies (including dev dependencies for build)"
npm install

log "Building server"
npm run build

log "Cleaning up dev dependencies"
npm install --omit=dev

# Installation des modules Python de base pour l'astronomie
log "Installation des modules Python de base"
if command -v python3 >/dev/null && command -v pip3 >/dev/null; then
  log "Installation des modules Python essentiels"
  python3 -m pip install --user numpy astropy pyindi-client

  # Vérifier l'installation
  if python3 -c "import numpy, astropy" 2>/dev/null; then
    log "Modules Python de base installés avec succès"
  else
    log "Erreur lors de l'installation des modules Python de base"
  fi
else
  log "Python3 ou pip3 non disponible"
fi

cd "$INSTALL_DIR/apps/web"

log "Building web interface"
rm -rf node_modules package-lock.json
npm install
npm run build
rm -rf node_modules package-lock.json

log "Installing hotspot service"
run "cp $INSTALL_DIR/server/scripts/start-hotspot.service /etc/systemd/system/"
run "systemctl enable start-hotspot.service"

# Configuration mDNS au niveau système
log "Configuration de la découverte de service mDNS"
if [ -f "$INSTALL_DIR/server/scripts/configure-mdns.sh" ]; then
  chmod +x "$INSTALL_DIR/server/scripts/configure-mdns.sh"
  "$INSTALL_DIR/server/scripts/configure-mdns.sh"
else
  log "Script de configuration mDNS non trouvé, configuration manuelle nécessaire"
fi

# Installation des drivers INDI
log "Installation des drivers INDI"
if [ -f "$INSTALL_DIR/server/scripts/maintain-indi-drivers.sh" ]; then
  chmod +x "$INSTALL_DIR/server/scripts/maintain-indi-drivers.sh"
  "$INSTALL_DIR/server/scripts/maintain-indi-drivers.sh" install-missing
  "$INSTALL_DIR/server/scripts/maintain-indi-drivers.sh" update-all
  "$INSTALL_DIR/server/scripts/maintain-indi-drivers.sh" setup-auto-update
else
  log "Script de maintenance des drivers non trouvé, installation alternative"

  # Étape 1: Supprimer complètement le PPA incompatible
  log "Étape 1: Suppression du PPA Ubuntu focal incompatible"
  if command -v add-apt-repository >/dev/null; then
    run "add-apt-repository --remove ppa:mutlaqja/ppa || true"
  fi
  run "rm -f /etc/apt/sources.list.d/mutlaqja-ubuntu-ppa-focal*.list || true"
  run "rm -f /etc/apt/sources.list.d/*mutlaqja* || true"
  run "rm -f /etc/apt/trusted.gpg.d/mutlaqja_ppa*.gpg || true"
  run "rm -f /etc/apt/trusted.gpg.d/*mutlaqja* || true"

  # Étape 2: Nettoyer les installations INDI partielles
  log "Étape 2: Nettoyage des installations INDI partielles"
  run "apt-get purge -y 'indi-*' 'libindi*' || true"
  run "apt-get autoremove -y || true"

  # Étape 3: Rafraîchir les listes de paquets et réparer
  log "Étape 3: Rafraîchissement des dépôts et réparation"
  run "apt-get update"
  run "apt-get --fix-broken install -y || true"

  # Étape 4: Installer INDI depuis les dépôts Debian officiels
  log "Étape 4: Installation d'INDI depuis les dépôts Debian Bookworm"
  if run "apt-get install -y indi-bin libindi1"; then
    log "Installation d'INDI de base réussie"

    # Essayer d'installer des drivers supplémentaires si disponibles
    log "Installation de drivers supplémentaires (optionnel)"
    run "apt-get install -y indi-full || true"

    log "Installation d'INDI terminée avec succès"
  else
    log "Échec de l'installation d'INDI depuis les dépôts Debian"
    log "Tentative de compilation depuis les sources..."

    # Fallback: compilation depuis les sources si les paquets Debian échouent aussi
    run "apt-get install -y cmake libcfitsio-dev libgsl-dev libjpeg-dev libfftw3-dev libftdi1-dev libusb-1.0-0-dev libnova-dev"

    TEMP_DIR=$(mktemp -d)
    cd "$TEMP_DIR"

    if git clone https://github.com/indilib/indi.git; then
      cd indi
      mkdir -p build
      cd build

      cmake -DCMAKE_INSTALL_PREFIX=/usr/local \
            -DCMAKE_BUILD_TYPE=Release \
            -DINDI_BUILD_DRIVERS=OFF \
            -DINDI_BUILD_CLIENT=OFF \
            -DINDI_BUILD_XISF=OFF \
            ..

      if make -j$(nproc); then
        run "make install"
        run "ldconfig"
        log "INDI compilé et installé avec succès"
      else
        log "Échec de la compilation, installation d'un serveur minimal"
        run "cat > /usr/local/bin/indiserver << 'EOF'
#!/bin/bash
echo 'AirAstro: Serveur INDI minimal pour développement'
echo 'Port: 7624'
while true; do sleep 60; done
EOF"
        run "chmod +x /usr/local/bin/indiserver"
      fi

      cd "$INSTALL_DIR/server"
      rm -rf "$TEMP_DIR"
    else
      log "Échec du clonage, installation d'un serveur minimal"
      run "cat > /usr/local/bin/indiserver << 'EOF'
#!/bin/bash
echo 'AirAstro: Serveur INDI minimal pour développement'
echo 'Port: 7624'
while true; do sleep 60; done
EOF"
      run "chmod +x /usr/local/bin/indiserver"
      cd "$INSTALL_DIR/server"
    fi
  fi

  # Vérification finale
  if command -v indiserver >/dev/null; then
    log "✅ Installation d'INDI réussie - indiserver disponible"
    indiserver --version 2>/dev/null || echo "indiserver installé"
  else
    log "⚠️  ATTENTION: indiserver non disponible, fonctionnalités limitées"
  fi
fi

AIRASTRO_SERVICE=/etc/systemd/system/airastro.service
TARGET_USER=${SUDO_USER:-$(whoami)}

log "Configuring AirAstro systemd service"
tmpfile=$(mktemp)
cat <<SERVICE > "$tmpfile"
[Unit]
Description=AirAstro Server
After=network.target

[Service]
WorkingDirectory=$INSTALL_DIR/server
ExecStart=/usr/bin/node $INSTALL_DIR/server/dist/index.js
Restart=on-failure
User=$TARGET_USER
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
SERVICE
run "mv $tmpfile $AIRASTRO_SERVICE"
run "systemctl daemon-reload"
run "systemctl enable airastro.service"
run "systemctl restart airastro.service"

# Rendre les scripts mDNS exécutables
log "Configuration des scripts de gestion mDNS"
chmod +x "$INSTALL_DIR/server/scripts/"*.sh

# Détection et installation automatique des équipements
log "Détection et installation automatique des équipements"
if [ -f "$INSTALL_DIR/server/scripts/equipment-manager.sh" ]; then
  log "Détection automatique des équipements connectés"
  "$INSTALL_DIR/server/scripts/equipment-manager.sh" detect

  # Installation automatique des caméras ASI si détectées
  if lsusb | grep -q "03c3"; then
    log "Caméra(s) ZWO ASI détectée(s), installation automatique du support"
    "$INSTALL_DIR/server/scripts/equipment-manager.sh" install asi
  fi

  # Installation automatique des caméras QHY si détectées
  if lsusb | grep -q "1618"; then
    log "Caméra(s) QHY détectée(s), installation automatique du support"
    "$INSTALL_DIR/server/scripts/equipment-manager.sh" install qhy
  fi

  # Installation automatique des caméras Canon si détectées
  if lsusb | grep -q "04a9"; then
    log "Caméra(s) Canon détectée(s), installation automatique du support"
    "$INSTALL_DIR/server/scripts/equipment-manager.sh" install canon
  fi

  # Installation automatique des caméras Nikon si détectées
  if lsusb | grep -q "04b0"; then
    log "Caméra(s) Nikon détectée(s), installation automatique du support"
    "$INSTALL_DIR/server/scripts/equipment-manager.sh" install nikon
  fi

  log "Installation automatique des équipements terminée"
else
  log "Script de gestion des équipements non trouvé, détection manuelle"

  # Détection manuelle et installation si nécessaire
  if lsusb | grep -q "03c3"; then
    log "Caméra(s) ZWO ASI détectée(s)"
    if [ -f "$INSTALL_DIR/server/scripts/brands/asi/install-asi-complete.sh" ]; then
      log "Installation automatique du support ASI"
      "$INSTALL_DIR/server/scripts/brands/asi/install-asi-complete.sh"
    else
      log "Installation manuelle des modules Python pour ASI"
      if command -v python3 >/dev/null && command -v pip3 >/dev/null; then
        python3 -m pip install --user zwoasi pyindi-client astropy numpy
      fi
    fi
  fi
fi

# Initialiser l'environnement AirAstro
log "Initialisation de l'environnement AirAstro"
if [ -f "$INSTALL_DIR/server/scripts/init-airastro-environment.sh" ]; then
  "$INSTALL_DIR/server/scripts/init-airastro-environment.sh"
else
  # Fallback: créer manuellement les répertoires
  run "mkdir -p /opt/airastro"
  run "chmod 755 /opt/airastro"
fi

# Vérification finale de la configuration mDNS
log "Vérification de la configuration mDNS"
if [ -f "$INSTALL_DIR/server/scripts/check-mdns.sh" ]; then
  sleep 3  # Attendre que les services se stabilisent
  "$INSTALL_DIR/server/scripts/check-mdns.sh"
fi

# Vérification post-installation complète
log "Vérification post-installation complète"
if [ -f "$INSTALL_DIR/server/scripts/installation/post-install-check.sh" ]; then
  chmod +x "$INSTALL_DIR/server/scripts/installation/post-install-check.sh"
  "$INSTALL_DIR/server/scripts/installation/post-install-check.sh"
else
  log "Script de vérification post-installation non trouvé"
fi

log "Installation complete!"
log ""
log "🎯 AirAstro est maintenant accessible via:"
log "   - http://airastro.local (découverte automatique)"
log "   - http://10.42.0.1 (point d'accès WiFi)"
log "   - http://$(hostname -I | awk '{print $1}') (IP locale)"
log ""
log "🔧 Scripts de gestion disponibles:"
log "   - $INSTALL_DIR/server/scripts/installation/post-install-check.sh (vérification complète)"
log "   - $INSTALL_DIR/server/scripts/equipment-manager.sh (gestion équipements)"
log "   - $INSTALL_DIR/server/scripts/check-mdns.sh (diagnostic mDNS)"
log "   - $INSTALL_DIR/server/scripts/configure-mdns.sh (reconfiguration mDNS)"
log "   - $INSTALL_DIR/server/scripts/cleanup-mdns.sh (nettoyage mDNS)"

