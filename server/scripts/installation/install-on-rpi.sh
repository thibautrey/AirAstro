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

# Optimisation de la compilation du serveur
log "Vérification et construction du serveur"
if [ -f "dist/index.js" ] && [ -f "package.json" ]; then
  # Vérifier si les sources sont plus récentes que le build
  if [ "src/index.ts" -nt "dist/index.js" ] || [ "package.json" -nt "dist/index.js" ]; then
    log "Sources modifiées, recompilation nécessaire"
    NEED_BUILD=true
  else
    log "✅ Build serveur à jour"
    NEED_BUILD=false
  fi
else
  log "Build serveur manquant, compilation nécessaire"
  NEED_BUILD=true
fi

if [ "$NEED_BUILD" = true ]; then
  log "Nettoyage des anciens modules"
  rm -rf node_modules package-lock.json

  log "Installation des dépendances (dev pour build)"
  npm install

  log "Construction du serveur"
  npm run build

  log "Nettoyage des dépendances de dev"
  npm install --omit=dev
else
  log "✅ Build serveur déjà à jour, vérification des dépendances"
  if [ ! -d "node_modules" ]; then
    log "Installation des dépendances de production"
    npm install --omit=dev
  else
    log "✅ Dépendances de production présentes"
  fi
fi

# Installation des modules Python de base pour l'astronomie
log "Vérification et installation des modules Python de base"
if command -v python3 >/dev/null && command -v pip3 >/dev/null; then
  # Modules Python essentiels
  PYTHON_MODULES=(
    "numpy:NumPy (calculs scientifiques)"
    "astropy:AstroPy (astronomie)"
    "pyindi-client:PyINDI (client INDI)"
  )

  MODULES_TO_INSTALL=()

  # Vérifier quels modules sont manquants
  for module_info in "${PYTHON_MODULES[@]}"; do
    module_name=$(echo "$module_info" | cut -d: -f1)
    module_desc=$(echo "$module_info" | cut -d: -f2)

    if python3 -c "import $module_name" 2>/dev/null; then
      log "✅ $module_desc déjà installé"
    else
      log "❌ $module_desc manquant"
      MODULES_TO_INSTALL+=("$module_name")
    fi
  done

  # Installer uniquement les modules manquants
  if [ ${#MODULES_TO_INSTALL[@]} -gt 0 ]; then
    log "Installation des modules manquants: ${MODULES_TO_INSTALL[*]}"
    if python3 -m pip install --user "${MODULES_TO_INSTALL[@]}"; then
      log "✅ Modules Python installés avec succès"
    else
      log "⚠️  Erreur lors de l'installation, tentative avec sudo"
      sudo python3 -m pip install "${MODULES_TO_INSTALL[@]}" || true
    fi

    # Vérification finale
    ALL_INSTALLED=true
    for module in "${MODULES_TO_INSTALL[@]}"; do
      if ! python3 -c "import $module" 2>/dev/null; then
        log "❌ Module $module toujours manquant"
        ALL_INSTALLED=false
      fi
    done

    if [ "$ALL_INSTALLED" = true ]; then
      log "✅ Tous les modules Python requis sont installés"
    else
      log "⚠️  Certains modules Python sont manquants (continuons)"
    fi
  else
    log "✅ Tous les modules Python requis sont déjà installés"
  fi
else
  log "❌ Python3 ou pip3 non disponible"
fi

cd "$INSTALL_DIR/apps/web"

# Optimisation de la construction de l'interface web
log "Vérification et construction de l'interface web"
if [ -f "dist/index.html" ] && [ -f "package.json" ]; then
  # Vérifier si les sources sont plus récentes que le build
  if [ "src/main.tsx" -nt "dist/index.html" ] || [ "package.json" -nt "dist/index.html" ]; then
    log "Sources web modifiées, recompilation nécessaire"
    NEED_WEB_BUILD=true
  else
    log "✅ Build interface web à jour"
    NEED_WEB_BUILD=false
  fi
else
  log "Build interface web manquant, compilation nécessaire"
  NEED_WEB_BUILD=true
fi

if [ "$NEED_WEB_BUILD" = true ]; then
  log "Construction de l'interface web"
  rm -rf node_modules package-lock.json
  npm install
  npm run build
  rm -rf node_modules package-lock.json
else
  log "✅ Interface web déjà construite"
fi

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
log "Vérification et installation des drivers INDI"

# Fonction pour vérifier si INDI est déjà installé
check_indi_installation() {
  local indi_installed=false

  # Vérifier si indiserver est disponible
  if command -v indiserver >/dev/null 2>&1; then
    log "indiserver trouvé: $(which indiserver)"
    indi_installed=true
  fi

  # Vérifier si les bibliothèques INDI sont installées
  if dpkg -l | grep -q "^ii.*libindi1" 2>/dev/null; then
    log "Bibliothèques INDI détectées"
    indi_installed=true
  fi

  # Vérifier si des drivers INDI sont installés
  if find /usr -name "indi_*" -type f -executable 2>/dev/null | head -1 | grep -q .; then
    log "Drivers INDI détectés"
    indi_installed=true
  fi

  if [ "$indi_installed" = true ]; then
    log "✅ INDI déjà installé, vérification de la version"
    if indiserver --version 2>/dev/null; then
      log "Version INDI OK"
    else
      log "Version INDI non détectable"
    fi
    return 0
  else
    log "❌ INDI non détecté, installation nécessaire"
    return 1
  fi
}

# Vérifier l'installation existante
if check_indi_installation; then
  log "INDI déjà installé, vérification des drivers supplémentaires"

  # Vérifier si des drivers spécifiques sont manquants
  MISSING_DRIVERS=()

  # Vérifier les drivers courants
  if lsusb | grep -q "03c3" && ! [ -f "/usr/bin/indi_asi_ccd" ]; then
    MISSING_DRIVERS+=("indi-asi")
    log "Driver ASI manquant pour caméra détectée"
  fi

  if lsusb | grep -q "1618" && ! [ -f "/usr/bin/indi_qhy_ccd" ]; then
    MISSING_DRIVERS+=("indi-qhy")
    log "Driver QHY manquant pour caméra détectée"
  fi

  if lsusb | grep -q -E "(04a9|04b0)" && ! [ -f "/usr/bin/indi_gphoto_ccd" ]; then
    MISSING_DRIVERS+=("indi-gphoto")
    log "Driver GPhoto manquant pour caméra détectée"
  fi

  # Installer uniquement les drivers manquants
  if [ ${#MISSING_DRIVERS[@]} -gt 0 ]; then
    log "Installation des drivers manquants: ${MISSING_DRIVERS[*]}"
    run "apt-get update -qq"
    for driver in "${MISSING_DRIVERS[@]}"; do
      run "apt-get install -y $driver || true"
    done
  else
    log "✅ Tous les drivers nécessaires sont installés"
  fi

else
  log "Installation complète d'INDI nécessaire"

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
  fi
fi

# Vérification finale
if command -v indiserver >/dev/null; then
  log "✅ Installation d'INDI réussie - indiserver disponible"
  indiserver --version 2>/dev/null || echo "indiserver installé"
else
  log "⚠️  ATTENTION: indiserver non disponible, fonctionnalités limitées"
fi

AIRASTRO_SERVICE=/etc/systemd/system/airastro.service
TARGET_USER=${SUDO_USER:-$(whoami)}

# Optimisation de la configuration du service systemd
log "Vérification et configuration du service AirAstro"
if [ -f "$AIRASTRO_SERVICE" ]; then
  # Vérifier si la configuration est à jour
  if grep -q "WorkingDirectory=$INSTALL_DIR/server" "$AIRASTRO_SERVICE" && \
     grep -q "ExecStart=/usr/bin/node $INSTALL_DIR/server/dist/index.js" "$AIRASTRO_SERVICE" && \
     grep -q "User=$TARGET_USER" "$AIRASTRO_SERVICE"; then
    log "✅ Service AirAstro déjà configuré correctement"
    SERVICE_NEEDS_UPDATE=false
  else
    log "Service AirAstro nécessite une mise à jour"
    SERVICE_NEEDS_UPDATE=true
  fi
else
  log "Service AirAstro non configuré, création nécessaire"
  SERVICE_NEEDS_UPDATE=true
fi

if [ "$SERVICE_NEEDS_UPDATE" = true ]; then
  log "Configuration du service systemd AirAstro"
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

  # Redémarrer le service
  if systemctl is-active --quiet airastro; then
    log "Redémarrage du service AirAstro"
    run "systemctl restart airastro.service"
  else
    log "Démarrage du service AirAstro"
    run "systemctl start airastro.service"
  fi
else
  # Service déjà configuré, juste s'assurer qu'il est activé et démarré
  if ! systemctl is-enabled --quiet airastro; then
    log "Activation du service AirAstro"
    run "systemctl enable airastro.service"
  fi

  if ! systemctl is-active --quiet airastro; then
    log "Démarrage du service AirAstro"
    run "systemctl start airastro.service"
  else
    log "✅ Service AirAstro déjà actif"
  fi
fi

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

