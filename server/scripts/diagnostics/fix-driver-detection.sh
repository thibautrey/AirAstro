#!/bin/bash
set -e

# Script de correction automatique pour la détection des drivers INDI

log() { echo -e "\033[1;32m[Fix Driver Detection]\033[0m $*"; }
warning() { echo -e "\033[1;33m[Warning]\033[0m $*"; }
error() { echo -e "\033[1;31m[Error]\033[0m $*"; }
success() { echo -e "\033[1;32m[Success]\033[0m $*"; }

log "🔧 Correction automatique de la détection des drivers INDI"
echo

# 1. Vérification des répertoires de recherche des drivers
log "1. Vérification des répertoires de drivers"
DRIVER_DIRS=(
    "/usr/local/bin"
    "/usr/bin"
    "/usr/local/lib/indi"
    "/usr/lib/indi"
    "/opt/indi/bin"
    "/usr/lib/x86_64-linux-gnu/indi"
)

for dir in "${DRIVER_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo "✅ Répertoire trouvé: $dir"
        # Compter les drivers INDI dans ce répertoire
        count=$(find "$dir" -name "indi_*" -type f -executable 2>/dev/null | wc -l)
        echo "   Drivers INDI trouvés: $count"

        # Lister les drivers ASI spécifiquement
        asi_drivers=$(find "$dir" -name "indi_asi*" -type f -executable 2>/dev/null)
        if [ -n "$asi_drivers" ]; then
            echo "   🎯 Drivers ASI trouvés:"
            echo "$asi_drivers" | sed 's/^/     /'
        fi
    else
        warning "Répertoire manquant: $dir"
    fi
done

# 2. Recherche spécifique du driver ASI
log "2. Recherche spécifique du driver ASI"
echo "Recherche de tous les drivers ASI sur le système..."

# Recherche plus large
ASI_DRIVERS=$(find /usr /opt -name "indi_asi*" -type f -executable 2>/dev/null || true)
if [ -n "$ASI_DRIVERS" ]; then
    success "✅ Drivers ASI trouvés sur le système:"
    echo "$ASI_DRIVERS" | sed 's/^/   /'

    # Vérifier les permissions
    echo
    log "Vérification des permissions:"
    for driver in $ASI_DRIVERS; do
        if [ -x "$driver" ]; then
            echo "   ✅ $driver (exécutable)"
        else
            warning "   ⚠️  $driver (non exécutable)"
            echo "      Correction des permissions..."
            sudo chmod +x "$driver" || error "Échec de la correction des permissions"
        fi
    done
else
    error "❌ Aucun driver ASI trouvé sur le système"
    echo "Le driver indi-asi n'est peut-être pas correctement installé"
fi

# 3. Vérification de l'installation du paquet
log "3. Vérification de l'installation du paquet indi-asi"
if dpkg -l | grep -q indi-asi; then
    success "✅ Paquet indi-asi installé"
    dpkg -l | grep indi-asi | sed 's/^/   /'

    # Lister les fichiers installés par le paquet
    echo
    log "Fichiers installés par le paquet indi-asi:"
    dpkg -L indi-asi | grep -E "(indi_|driver)" | head -10 | sed 's/^/   /'
else
    error "❌ Paquet indi-asi non installé"
    echo "Tentative de réinstallation..."
    sudo apt-get update
    sudo apt-get install -y indi-asi
fi

# 4. Test direct du driver
log "4. Test direct du driver ASI"
if command -v indi_asi_ccd >/dev/null 2>&1; then
    success "✅ Driver indi_asi_ccd trouvé dans PATH"
    echo "   Emplacement: $(which indi_asi_ccd)"

    # Test de démarrage rapide
    echo "   Test de démarrage rapide..."
    timeout 5s indi_asi_ccd -v 2>&1 | head -5 | sed 's/^/   /' || true
else
    error "❌ Driver indi_asi_ccd non trouvé dans PATH"

    # Recherche manuelle
    echo "   Recherche manuelle du driver..."
    MANUAL_SEARCH=$(find /usr /opt -name "indi_asi_ccd" -type f 2>/dev/null || true)
    if [ -n "$MANUAL_SEARCH" ]; then
        echo "   Trouvé manuellement: $MANUAL_SEARCH"
        echo "   Ajout au PATH..."
        DRIVER_DIR=$(dirname "$MANUAL_SEARCH")
        export PATH="$PATH:$DRIVER_DIR"
        echo "   PATH mis à jour temporairement"
    fi
fi

# 5. Vérification des dépendances
log "5. Vérification des dépendances ASI"
echo "Vérification des librairies ASI..."

# Vérifier libasi
if ldconfig -p | grep -q libasi; then
    success "✅ Librairie libasi trouvée"
    ldconfig -p | grep libasi | sed 's/^/   /'
else
    warning "⚠️  Librairie libasi non trouvée"
    echo "   Installation de libasi..."
    sudo apt-get install -y libasi
fi

# 6. Vérification des permissions USB
log "6. Vérification des permissions USB"
echo "Vérification des règles udev pour les caméras ASI..."

UDEV_RULES_DIR="/etc/udev/rules.d"
ASI_RULES_FILE="$UDEV_RULES_DIR/99-asi-cameras.rules"

if [ -f "$ASI_RULES_FILE" ]; then
    success "✅ Règles udev ASI trouvées"
    cat "$ASI_RULES_FILE" | sed 's/^/   /'
else
    warning "⚠️  Règles udev ASI manquantes"
    echo "   Création des règles udev..."

    sudo tee "$ASI_RULES_FILE" > /dev/null << 'EOF'
# Règles udev pour les caméras ZWO ASI
SUBSYSTEM=="usb", ATTRS{idVendor}=="03c3", MODE="0666", GROUP="plugdev"
SUBSYSTEM=="usb", ATTRS{idVendor}=="03c3", ATTRS{idProduct}=="120d", MODE="0666", GROUP="plugdev"
EOF

    echo "   Rechargement des règles udev..."
    sudo udevadm control --reload-rules
    sudo udevadm trigger

    success "✅ Règles udev créées et rechargées"
fi

# 7. Vérification de la caméra connectée
log "7. Vérification de la caméra ASI120MM-S"
echo "Recherche de la caméra ASI120MM-S (03c3:120d)..."

if lsusb | grep -q "03c3:120d"; then
    success "✅ Caméra ASI120MM-S détectée"
    lsusb | grep "03c3:120d" | sed 's/^/   /'

    # Vérifier les permissions
    USB_DEVICE=$(lsusb | grep "03c3:120d" | awk '{print $2 ":" $4}' | sed 's/://g')
    if [ -n "$USB_DEVICE" ]; then
        echo "   Vérification des permissions USB..."
        ls -la /dev/bus/usb/*/* | grep -E "(003|002)" | head -5 | sed 's/^/   /'
    fi
else
    error "❌ Caméra ASI120MM-S non détectée"
    echo "   Vérifiez que la caméra est bien connectée"
fi

# 8. Mise à jour de la base de données des drivers
log "8. Mise à jour de la base de données des drivers"
echo "Reconstruction de la base de données des drivers installés..."

# Créer un fichier temporaire avec tous les drivers trouvés
TEMP_DRIVERS="/tmp/airastro-drivers-found.txt"
echo "# Drivers INDI trouvés - $(date)" > "$TEMP_DRIVERS"
echo "# Généré automatiquement par fix-driver-detection.sh" >> "$TEMP_DRIVERS"
echo "" >> "$TEMP_DRIVERS"

for dir in "${DRIVER_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo "# Drivers dans $dir:" >> "$TEMP_DRIVERS"
        find "$dir" -name "indi_*" -type f -executable 2>/dev/null | sed 's/^/   /' >> "$TEMP_DRIVERS" || true
        echo "" >> "$TEMP_DRIVERS"
    fi
done

echo "Base de données des drivers mise à jour: $TEMP_DRIVERS"
cat "$TEMP_DRIVERS" | sed 's/^/   /'

# 9. Redémarrage du service AirAstro
log "9. Redémarrage du service AirAstro"
echo "Redémarrage du service pour prendre en compte les modifications..."

if systemctl is-active --quiet airastro.service; then
    echo "   Arrêt du service..."
    sudo systemctl stop airastro.service
    sleep 2
fi

echo "   Démarrage du service..."
sudo systemctl start airastro.service

# Attendre un peu et vérifier l'état
sleep 3
if systemctl is-active --quiet airastro.service; then
    success "✅ Service AirAstro redémarré avec succès"
else
    error "❌ Échec du redémarrage du service"
    echo "   Logs du service:"
    journalctl -u airastro.service -n 10 --no-pager | sed 's/^/   /'
fi

echo
success "🎉 Correction terminée!"
echo
echo "Prochaines étapes:"
echo "1. Vérifiez l'interface web d'AirAstro"
echo "2. La caméra ASI120MM-S devrait maintenant être détectée"
echo "3. Si le problème persiste, vérifiez les logs du service"
echo
echo "Commandes utiles:"
echo "- Vérifier le service: systemctl status airastro.service"
echo "- Voir les logs: journalctl -u airastro.service -f"
echo "- Tester le driver: indi_asi_ccd -v"
echo "- Lister les caméras: lsusb | grep 03c3"
