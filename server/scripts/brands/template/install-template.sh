#!/bin/bash
set -e

# Template pour les futures marques
# Copier ce fichier et l'adapter pour chaque nouvelle marque

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Source des fonctions communes
source "$PROJECT_ROOT/scripts/core/airastro-common.sh"

BRAND_NAME="TEMPLATE"
BRAND_DESCRIPTION="Template Brand"

log_info "Installation du support pour $BRAND_DESCRIPTION"
echo

# 1. Vérifications préliminaires
log_info "1. Vérifications préliminaires"

# Vérifier les privilèges
if [ "$EUID" -eq 0 ]; then
    log_warning "Ce script ne doit pas être exécuté en tant que root"
    exit 1
fi

# Vérifier sudo
if ! command -v sudo >/dev/null 2>&1; then
    log_error "sudo n'est pas disponible"
    exit 1
fi

# 2. Détection des équipements
log_info "2. Détection des équipements $BRAND_NAME"

# TODO: Remplacer par la détection spécifique à la marque
# Exemple pour USB: lsusb | grep "VENDOR_ID"
if lsusb | grep -q "VENDOR_ID_HERE"; then
    log_success "Équipement $BRAND_NAME détecté"
    lsusb | grep "VENDOR_ID_HERE" | sed 's/^/  /'
else
    log_warning "Aucun équipement $BRAND_NAME détecté"
    echo "Continuez si vous voulez installer le support sans équipement connecté"
fi

# 3. Installation des dépendances système
log_info "3. Installation des dépendances système"

sudo apt-get update -qq

# TODO: Adapter les dépendances selon la marque
DEPENDENCIES=(
    "build-essential"
    "cmake"
    "pkg-config"
    "libindi-dev"
    "libnova-dev"
    "libcfitsio-dev"
    "libusb-1.0-0-dev"
)

for dep in "${DEPENDENCIES[@]}"; do
    if ! dpkg -l | grep -q "^ii  $dep "; then
        log_info "Installation de $dep..."
        sudo apt-get install -y "$dep"
    else
        log_success "$dep déjà installé"
    fi
done

# 4. Installation des drivers INDI
log_info "4. Installation des drivers INDI"

# TODO: Remplacer par les paquets spécifiques à la marque
INDI_PACKAGES=(
    "indi-BRAND"
    "libBRAND"
)

for package in "${INDI_PACKAGES[@]}"; do
    if ! dpkg -l | grep -q "^ii  $package "; then
        log_info "Installation de $package..."
        sudo apt-get install -y "$package" || {
            log_warning "Installation via apt échouée pour $package"
            # TODO: Ajouter l'installation manuelle si nécessaire
        }
    else
        log_success "$package déjà installé"
    fi
done

# 5. Installation du SDK/bibliothèques spécifiques
log_info "5. Installation du SDK $BRAND_NAME"

# TODO: Implémenter l'installation du SDK spécifique
# Exemple:
# wget URL_SDK
# tar -xzf SDK.tar.gz
# sudo cp lib/* /usr/local/lib/
# sudo cp include/* /usr/local/include/

# 6. Configuration des permissions
log_info "6. Configuration des permissions"

# TODO: Adapter les règles udev selon la marque
UDEV_RULES_FILE="/etc/udev/rules.d/99-${BRAND_NAME,,}-cameras.rules"

if [ ! -f "$UDEV_RULES_FILE" ]; then
    log_info "Création des règles udev pour $BRAND_NAME"
    sudo tee "$UDEV_RULES_FILE" > /dev/null << EOF
# Règles udev pour les équipements $BRAND_DESCRIPTION
SUBSYSTEM=="usb", ATTRS{idVendor}=="VENDOR_ID", MODE="0666", GROUP="plugdev"
EOF

    sudo udevadm control --reload-rules
    sudo udevadm trigger
    log_success "Règles udev créées et appliquées"
else
    log_success "Règles udev déjà présentes"
fi

# 7. Installation des modules Python (si nécessaire)
log_info "7. Installation des modules Python"

# TODO: Adapter selon les modules Python nécessaires
PYTHON_MODULES=(
    "pyindi_client"
    # "module_specific_to_brand"
)

for module in "${PYTHON_MODULES[@]}"; do
    if ! python3 -c "import $module" 2>/dev/null; then
        log_info "Installation du module $module..."
        python3 -m pip install --user "$module"
    else
        log_success "Module $module déjà installé"
    fi
done

# 8. Configuration des groupes utilisateur
log_info "8. Configuration des groupes utilisateur"

CURRENT_USER=$(whoami)
for group in plugdev dialout; do
    if ! groups "$CURRENT_USER" | grep -q "$group"; then
        log_info "Ajout de l'utilisateur $CURRENT_USER au groupe $group"
        sudo usermod -a -G "$group" "$CURRENT_USER"
        log_warning "Reconnectez-vous pour que les changements prennent effet"
    else
        log_success "Utilisateur déjà dans le groupe $group"
    fi
done

# 9. Tests de l'installation
log_info "9. Tests de l'installation"

# TODO: Implémenter les tests spécifiques
# Exemple de test générique:
echo "Test de détection USB:"
if lsusb | grep -q "VENDOR_ID_HERE"; then
    log_success "Équipement détecté"
else
    log_warning "Équipement non détecté"
fi

# 10. Création d'un script de test
log_info "10. Création d'un script de test"

TEST_SCRIPT="/tmp/test-${BRAND_NAME,,}.sh"
cat > "$TEST_SCRIPT" << EOF
#!/bin/bash
echo "🧪 Test de l'installation $BRAND_DESCRIPTION"
echo "=" * 50

# TODO: Implémenter les tests spécifiques
echo "Test USB:"
lsusb | grep "VENDOR_ID_HERE" || echo "Pas d'équipement détecté"

echo
echo "Test des drivers INDI:"
find /usr -name "indi_*${BRAND_NAME,,}*" -type f -executable

echo
echo "Test Python:"
python3 -c "import pyindi_client; print('✅ pyindi_client OK')" || echo "❌ pyindi_client KO"

echo
echo "Test terminé"
EOF

chmod +x "$TEST_SCRIPT"
log_success "Script de test créé: $TEST_SCRIPT"

# 11. Résumé final
echo
log_success "🎉 Installation $BRAND_DESCRIPTION terminée!"
echo
echo "📋 Résumé:"
echo "- Drivers INDI: ✅ Installés"
echo "- SDK $BRAND_NAME: ✅ Installé"
echo "- Permissions: ✅ Configurées"
echo "- Script de test: $TEST_SCRIPT"
echo
echo "🔧 Prochaines étapes:"
echo "1. Redémarrez le système si nécessaire"
echo "2. Connectez votre équipement $BRAND_NAME"
echo "3. Testez avec: $TEST_SCRIPT"
echo "4. Vérifiez dans l'interface AirAstro"
echo
echo "📞 Support:"
echo "- Diagnostic: $SCRIPT_DIR/diagnose-${BRAND_NAME,,}.sh"
echo "- Détection: lsusb | grep VENDOR_ID_HERE"
echo "- Logs: dmesg | grep -i $BRAND_NAME"
