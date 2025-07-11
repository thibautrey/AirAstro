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

  # Supprimer les dépôts problématiques d'Ubuntu/PPA
  log "Nettoyage des dépôts incompatibles"
  run "rm -f /etc/apt/sources.list.d/*mutlaqja* || true"
  run "rm -f /etc/apt/sources.list.d/*ubuntu* || true"

  # Installer les dépendances de base disponibles dans Debian
  log "Installation des dépendances de base Debian"
  run "apt-get update"
  run "apt-get install -y libcfitsio-dev libgsl-dev libjpeg-dev libdc1394-dev libgps-dev cmake build-essential"

  # Essayer d'installer les versions disponibles dans Debian
  log "Tentative d'installation des paquets INDI de base"
  if run "apt-get install -y --no-install-recommends libindi-dev || true"; then
    log "Bibliothèques INDI de base installées"
  fi

  # Vérifier si indiserver est disponible
  if ! command -v indiserver >/dev/null; then
    log "indiserver non disponible, compilation depuis les sources..."

    # Installer les dépendances de compilation
    run "apt-get install -y cmake libcfitsio-dev libgsl-dev libjpeg-dev libfftw3-dev libftdi1-dev libusb-1.0-0-dev libnova-dev"

    # Créer un répertoire temporaire pour la compilation
    TEMP_DIR=$(mktemp -d)
    cd "$TEMP_DIR"

    # Télécharger et compiler INDI
    if git clone https://github.com/indilib/indi.git; then
      cd indi
      mkdir -p build
      cd build

      # Configuration CMake adaptée pour Raspberry Pi
      cmake -DCMAKE_INSTALL_PREFIX=/usr/local \
            -DCMAKE_BUILD_TYPE=Release \
            -DINDI_BUILD_DRIVERS=OFF \
            -DINDI_BUILD_CLIENT=OFF \
            -DINDI_BUILD_XISF=OFF \
            ..

      # Compilation avec gestion des erreurs
      if make -j$(nproc); then
        run "make install"
        run "ldconfig"
        log "INDI compilé et installé avec succès"
      else
        log "Échec de la compilation d'INDI, installation d'un serveur minimal"
        # Créer un script simulant indiserver pour le développement
        run "cat > /usr/local/bin/indiserver << 'EOF'
#!/bin/bash
echo 'AirAstro: Serveur INDI simulé pour développement'
echo 'Port: 7624'
while true; do sleep 60; done
EOF"
        run "chmod +x /usr/local/bin/indiserver"
      fi

      cd "$INSTALL_DIR/server"
      rm -rf "$TEMP_DIR"
    else
      log "Échec du clonage d'INDI, installation d'un serveur minimal"
      # Créer un script simulant indiserver pour le développement
      run "cat > /usr/local/bin/indiserver << 'EOF'
#!/bin/bash
echo 'AirAstro: Serveur INDI simulé pour développement'
echo 'Port: 7624'
while true; do sleep 60; done
EOF"
      run "chmod +x /usr/local/bin/indiserver"
      cd "$INSTALL_DIR/server"
    fi
  else
    log "indiserver déjà disponible"
  fi

  # Vérifier l'installation finale
  if command -v indiserver >/dev/null; then
    log "Installation d'INDI réussie - indiserver disponible"
  else
    log "ATTENTION: indiserver non disponible, fonctionnalités limitées"
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

log "Installation complete!"
log ""
log "🎯 AirAstro est maintenant accessible via:"
log "   - http://airastro.local (découverte automatique)"
log "   - http://10.42.0.1 (point d'accès WiFi)"
log "   - http://$(hostname -I | awk '{print $1}') (IP locale)"
log ""
log "🔧 Scripts de gestion mDNS disponibles:"
log "   - $INSTALL_DIR/server/scripts/check-mdns.sh (diagnostic)"
log "   - $INSTALL_DIR/server/scripts/configure-mdns.sh (reconfiguration)"
log "   - $INSTALL_DIR/server/scripts/cleanup-mdns.sh (nettoyage)"

