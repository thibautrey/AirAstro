#!/bin/bash

# Script de démarrage pour AirAstro Server avec gestion des drivers

echo "🚀 Démarrage du serveur AirAstro..."

# Vérifier si nous sommes sur un système compatible
if ! command -v apt-get &> /dev/null; then
    echo "⚠️  Ce système ne semble pas être basé sur Debian/Ubuntu"
    echo "⚠️  Certaines fonctionnalités de gestion des drivers pourraient ne pas fonctionner"
fi

# Vérifier les permissions sudo
if ! sudo -n true 2>/dev/null; then
    echo "⚠️  Permissions sudo requises pour l'installation automatique des drivers"
    echo "⚠️  Veuillez configurer sudo sans mot de passe ou installer les drivers manuellement"
fi

# Vérifier si INDI est installé
if ! command -v indiserver &> /dev/null; then
    echo "❌ INDI n'est pas installé sur ce système"
    echo "📦 Installation d'INDI..."
    
    if command -v apt-get &> /dev/null; then
        sudo apt-get update
        sudo apt-get install -y indi-bin libindi-dev
        echo "✅ INDI installé avec succès"
    else
        echo "❌ Impossible d'installer INDI automatiquement"
        echo "📖 Veuillez installer INDI manuellement : https://indilib.org/get-indi.html"
        exit 1
    fi
else
    echo "✅ INDI est déjà installé"
fi

# Créer les répertoires nécessaires
mkdir -p data/drivers
mkdir -p data/images
mkdir -p logs

# Définir les permissions
chmod 755 data/drivers
chmod 755 data/images
chmod 755 logs

echo "📁 Répertoires créés avec succès"

# Démarrer le serveur
echo "🔥 Démarrage du serveur Node.js..."
node dist/index.js
