#!/bin/bash

# Script d'installation des drivers INDI essentiels pour AirAstro

echo "🔧 Installation des drivers INDI essentiels..."

# Fonction pour vérifier si un paquet est installé
is_package_installed() {
    dpkg -l | grep -q "^ii  $1 "
}

# Fonction pour installer un paquet
install_package() {
    local package_name=$1
    local description=$2
    
    if is_package_installed "$package_name"; then
        echo "✅ $package_name est déjà installé ($description)"
        return 0
    fi
    
    echo "📦 Installation de $package_name ($description)..."
    
    if sudo apt-get install -y "$package_name" &> /dev/null; then
        echo "✅ $package_name installé avec succès"
        return 0
    else
        echo "❌ Échec de l'installation de $package_name"
        return 1
    fi
}

# Mettre à jour la liste des paquets
echo "🔄 Mise à jour de la liste des paquets..."
sudo apt-get update &> /dev/null

# Installer les dépendances de base
echo "🛠️  Installation des dépendances de base..."
install_package "indi-bin" "INDI Server Core"
install_package "libindi-dev" "INDI Development Libraries"

# Installer les librairies essentielles
echo "📚 Installation des librairies essentielles..."
install_package "libasi" "ZWO ASI Camera Library"
install_package "libqhy" "QHY Camera Library"
install_package "libplayerone" "Player One Camera Library"
install_package "libsvbony" "SVBONY Camera Library"
install_package "libtoupcam" "ToupTek Camera Library"

# Installer les drivers de caméras populaires
echo "📸 Installation des drivers de caméras..."
install_package "indi-asi" "ZWO ASI Camera Driver"
install_package "indi-qhy" "QHY Camera Driver"
install_package "indi-gphoto" "DSLR Camera Driver"
install_package "indi-playerone" "Player One Camera Driver"
install_package "indi-svbony" "SVBONY Camera Driver"
install_package "indi-toupbase" "ToupTek Camera Driver"

# Installer les drivers de montures populaires
echo "🔭 Installation des drivers de montures..."
install_package "indi-eqmod" "EQMod Mount Driver (Sky-Watcher, etc.)"
install_package "indi-celestronaux" "Celestron Mount Driver"

# Installer les drivers d'accessoires
echo "🛡️  Installation des drivers d'accessoires..."
install_package "indi-asi-power" "ASI Power/Focus Driver"
install_package "indi-gpsd" "GPS Driver"
install_package "indi-aagcloudwatcher-ng" "AAG Cloud Watcher Driver"

# Vérifier l'installation
echo "🔍 Vérification de l'installation..."
installed_count=0
total_count=0

packages=(
    "indi-bin"
    "libindi-dev"
    "libasi"
    "libqhy"
    "libplayerone"
    "libsvbony"
    "libtoupcam"
    "indi-asi"
    "indi-qhy"
    "indi-gphoto"
    "indi-playerone"
    "indi-svbony"
    "indi-toupbase"
    "indi-eqmod"
    "indi-celestronaux"
    "indi-asi-power"
    "indi-gpsd"
    "indi-aagcloudwatcher-ng"
)

for package in "${packages[@]}"; do
    ((total_count++))
    if is_package_installed "$package"; then
        ((installed_count++))
    fi
done

echo "📊 Résumé de l'installation :"
echo "   • $installed_count/$total_count paquets installés avec succès"
echo "   • $(( (installed_count * 100) / total_count ))% de réussite"

if [ $installed_count -eq $total_count ]; then
    echo "🎉 Tous les drivers essentiels ont été installés avec succès !"
else
    echo "⚠️  Certains drivers n'ont pas pu être installés"
    echo "📖 Vérifiez les logs ci-dessus pour plus de détails"
fi

# Créer un fichier de log
log_file="/tmp/airastro-drivers-install.log"
echo "📝 Création du fichier de log : $log_file"
{
    echo "AirAstro Drivers Installation Log"
    echo "Date: $(date)"
    echo "Installed: $installed_count/$total_count packages"
    echo ""
    echo "Package Details:"
    for package in "${packages[@]}"; do
        if is_package_installed "$package"; then
            echo "✅ $package - INSTALLED"
        else
            echo "❌ $package - NOT INSTALLED"
        fi
    done
} > "$log_file"

echo "✅ Installation terminée. Log disponible dans : $log_file"
