#!/bin/bash

# Fonctions utilitaires
log() { echo -e "\033[1;32m[AirAstro]\033[0m $*"; }
error() { echo -e "\033[1;31m[Error]\033[0m $*" >&2; }
warn() { echo -e "\033[1;33m[Warning]\033[0m $*"; }

if [ "$(id -u)" -ne 0 ] && ! command -v sudo >/dev/null; then
  echo "This script requires root privileges or sudo" >&2
  exit 1
fi

run() { if [ "$(id -u)" -eq 0 ]; then bash -c "$*"; else sudo bash -c "$*"; fi; }

# Fonction pour nettoyer les conflits de packages
fix_package_conflicts() {
  log "Détection et résolution des conflits de packages..."

  # Vérifier s'il y a des packages cassés
  if ! run "dpkg --configure -a"; then
    warn "Configuration des packages interrompue"
  fi

  # Résoudre le conflit spécifique Player One
  if dpkg -l | grep -q "indi-playerone" && dpkg -l | grep -q "libplayerone"; then
    log "Résolution du conflit Player One détecté"
    # Supprimer les packages en conflit et les réinstaller proprement
    run "dpkg --remove --force-remove-reinstreq indi-playerone libplayerone libplayeronecamera2 2>/dev/null || true"
    run "apt-get purge -y indi-playerone libplayerone libplayeronecamera2 2>/dev/null || true"

    # Nettoyer les fichiers de règles en conflit
    run "rm -f /lib/udev/rules.d/99-player_one_astronomy.rules 2>/dev/null || true"
    run "rm -f /etc/udev/rules.d/99-player_one_astronomy.rules 2>/dev/null || true"
  fi

  # Nettoyer le cache apt
  run "apt-get clean"
  run "apt-get autoclean"

  # Réparation générale
  if ! run "apt-get --fix-broken install -y"; then
    warn "Réparation automatique échouée, nettoyage manuel..."

    # Forcer la suppression des packages problématiques
    run "dpkg --remove --force-remove-reinstreq --force-depends $(dpkg -l | grep '^..r' | awk '{print $2}') 2>/dev/null || true"

    # Nouvelle tentative
    run "apt-get --fix-broken install -y || true"
  fi

  log "✅ Conflits de packages résolus"
}

INSTALL_DIR=${AIRASTRO_DIR:-$HOME/AirAstro}
REPO_URL="https://github.com/thibautrey/AirAstro.git"
BRANCH="main"

log "Updating package lists"
run "apt-get update -y"

# Résoudre les conflits de packages avant d'installer quoi que ce soit
fix_package_conflicts

run "apt-get install -y git curl build-essential python3 python3-pip python3-venv python3-dev"

# Vérifier l'installation de Python3 et pip3
if ! command -v python3 >/dev/null; then
  error "Python3 n'a pas pu être installé"
  exit 1
fi

if ! command -v pip3 >/dev/null; then
  error "pip3 n'a pas pu être installé"
  exit 1
fi

log "✅ Python3 $(python3 --version) et pip3 installés avec succès"

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
  log "❌ Python3 ou pip3 non disponible, installation automatique"

  # Installation de Python3 et pip3
  log "Installation de Python3 et pip3"
  run "apt-get update -qq"
  run "apt-get install -y python3 python3-pip python3-venv python3-dev"

  # Vérifier l'installation
  if command -v python3 >/dev/null && command -v pip3 >/dev/null; then
    log "✅ Python3 et pip3 installés avec succès"

    # Maintenant installer les modules Python de base
    log "Installation des modules Python de base après installation de Python"
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
    log "❌ Échec de l'installation de Python3/pip3"
    log "⚠️  Fonctionnalités Python limitées - installation manuelle requise"
  fi
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

# Fonction pour installer INDI de manière sécurisée
install_indi_safely() {
  log "Installation sécurisée d'INDI..."

  # Nettoyer les conflits avant l'installation
  fix_package_conflicts

  # Supprimer les anciens PPAs problématiques
  log "Suppression des PPAs incompatibles"
  if command -v add-apt-repository >/dev/null; then
    run "add-apt-repository --remove ppa:mutlaqja/ppa || true"
  fi
  run "rm -f /etc/apt/sources.list.d/mutlaqja-ubuntu-ppa-focal*.list || true"
  run "rm -f /etc/apt/sources.list.d/*mutlaqja* || true"
  run "rm -f /etc/apt/trusted.gpg.d/mutlaqja_ppa*.gpg || true"
  run "rm -f /etc/apt/trusted.gpg.d/*mutlaqja* || true"

  # Mettre à jour la liste des paquets
  run "apt-get update"

  # Installer les paquets INDI de base depuis les dépôts officiels
  log "Installation d'INDI depuis les dépôts officiels Debian"
  if run "apt-get install -y indi-bin libindi1 libindi-dev"; then
    log "✅ Installation d'INDI de base réussie"

    # Essayer d'installer des drivers courants de manière sélective
    log "Installation sélective des drivers INDI courants"

    # Liste des drivers à installer avec vérification de conflit
    SAFE_DRIVERS=(
      "indi-asi:ZWO ASI Cameras"
      "indi-qhy:QHY Cameras"
      "indi-gphoto:Canon/Nikon DSLR via GPhoto"
      "indi-celestron:Celestron Telescopes"
      "indi-skywatcher:SkyWatcher Mounts"
    )

    # Exclure spécifiquement les drivers problématiques
    PROBLEMATIC_DRIVERS=(
      "indi-playerone"
      "libplayerone"
      "libplayeronecamera2"
    )

    for driver_info in "${SAFE_DRIVERS[@]}"; do
      driver_name=$(echo "$driver_info" | cut -d: -f1)
      driver_desc=$(echo "$driver_info" | cut -d: -f2)

      # Vérifier si le driver est dans la liste des problématiques
      skip_driver=false
      for problematic in "${PROBLEMATIC_DRIVERS[@]}"; do
        if [[ "$driver_name" == *"$problematic"* ]]; then
          skip_driver=true
          break
        fi
      done

      if [ "$skip_driver" = false ]; then
        log "Tentative d'installation: $driver_desc"
        if run "apt-get install -y $driver_name"; then
          log "✅ $driver_desc installé avec succès"
        else
          warn "⚠️  Échec de l'installation de $driver_desc (continuons sans)"
        fi
      else
        warn "⚠️  Driver $driver_name ignoré (conflit connu)"
      fi
    done

    return 0
  else
    warn "Échec de l'installation depuis les dépôts officiels"
    return 1
  fi
}

# Vérifier l'installation existante
if check_indi_installation; then
  log "INDI déjà installé, vérification des drivers supplémentaires"

  # Vérifier si des drivers spécifiques sont manquants
  MISSING_DRIVERS=()

  # Vérifier les drivers courants (éviter les conflits)
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

  # Installer uniquement les drivers manquants (éviter Player One)
  if [ ${#MISSING_DRIVERS[@]} -gt 0 ]; then
    log "Installation des drivers manquants: ${MISSING_DRIVERS[*]}"
    fix_package_conflicts
    run "apt-get update -qq"
    for driver in "${MISSING_DRIVERS[@]}"; do
      if [[ "$driver" != *"playerone"* ]]; then
        run "apt-get install -y $driver || true"
      else
        warn "Driver $driver ignoré (conflit connu)"
      fi
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
    # Utiliser la fonction d'installation sécurisée
    if ! install_indi_safely; then
      log "Installation d'INDI échouée, tentative de compilation depuis les sources..."

      # Fallback: compilation depuis les sources
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

# Rendre les scripts exécutables dès le début
log "Configuration des scripts de gestion et permissions"
chmod +x "$INSTALL_DIR/server/scripts/"*.sh
chmod +x "$INSTALL_DIR/server/scripts/core/"*.sh
chmod +x "$INSTALL_DIR/server/scripts/brands/"*/*.sh 2>/dev/null || true

# Détection et installation automatique des équipements
log "Détection et installation automatique des équipements"

# Rendre le gestionnaire d'équipements exécutable
chmod +x "$INSTALL_DIR/server/scripts/equipment-manager.sh" 2>/dev/null || true

if [ -f "$INSTALL_DIR/server/scripts/equipment-manager.sh" ]; then
  log "Utilisation du gestionnaire d'équipements pour la détection et l'installation"

  # Détection automatique des équipements connectés
  log "Détection automatique des équipements connectés"
  "$INSTALL_DIR/server/scripts/equipment-manager.sh" detect

  # Installation automatique basée sur la détection USB
  log "Installation automatique des drivers détectés"

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

  # Éviter explicitement Player One (conflit connu)
  if lsusb | grep -q "a0a0"; then
    warn "Caméra(s) Player One détectée(s) - Installation manuelle recommandée"
    warn "Raison: Conflits de packages connus avec libplayerone/libplayeronecamera2"
    warn "Utilisez le script de résolution de conflits si nécessaire:"
    warn "   $INSTALL_DIR/server/scripts/fix-package-conflicts.sh player-one"
  fi

  log "Installation automatique des équipements terminée"
else
  log "Gestionnaire d'équipements non trouvé, utilisation de la méthode de fallback"

  # Fallback simplifié utilisant uniquement les scripts spécifiques
  if lsusb | grep -q "03c3"; then
    log "Caméra(s) ZWO ASI détectée(s)"
    if [ -f "$INSTALL_DIR/server/scripts/brands/asi/install-asi-complete.sh" ]; then
      log "Installation automatique du support ASI"
      chmod +x "$INSTALL_DIR/server/scripts/brands/asi/install-asi-complete.sh"
      "$INSTALL_DIR/server/scripts/brands/asi/install-asi-complete.sh"
    fi
  fi

  if lsusb | grep -q "1618"; then
    log "Caméra(s) QHY détectée(s)"
    if [ -f "$INSTALL_DIR/server/scripts/brands/qhy/install-qhy.sh" ]; then
      log "Installation automatique du support QHY"
      chmod +x "$INSTALL_DIR/server/scripts/brands/qhy/install-qhy.sh"
      "$INSTALL_DIR/server/scripts/brands/qhy/install-qhy.sh"
    fi
  fi

  if lsusb | grep -q "04a9"; then
    log "Caméra(s) Canon détectée(s)"
    if [ -f "$INSTALL_DIR/server/scripts/brands/canon/install-canon.sh" ]; then
      log "Installation automatique du support Canon"
      chmod +x "$INSTALL_DIR/server/scripts/brands/canon/install-canon.sh"
      "$INSTALL_DIR/server/scripts/brands/canon/install-canon.sh"
    fi
  fi

  if lsusb | grep -q "04b0"; then
    log "Caméra(s) Nikon détectée(s)"
    if [ -f "$INSTALL_DIR/server/scripts/brands/nikon/install-nikon.sh" ]; then
      log "Installation automatique du support Nikon"
      chmod +x "$INSTALL_DIR/server/scripts/brands/nikon/install-nikon.sh"
      "$INSTALL_DIR/server/scripts/brands/nikon/install-nikon.sh"
    fi
  fi

  # Éviter Player One même en fallback
  if lsusb | grep -q "a0a0"; then
    warn "Caméra(s) Player One détectée(s) - Installation automatique désactivée"
    warn "Raison: Conflits de packages connus"
    warn "Installation manuelle requise - voir documentation Player One"
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

