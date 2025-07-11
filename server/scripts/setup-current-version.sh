#!/bin/bash
# Script pour configurer la version courante selon le fichier version.json

set -e

INSTALL_PATH="/opt/airastro"
VERSION_FILE="$INSTALL_PATH/current/server/config/version.json"
CURRENT_LINK="$INSTALL_PATH/current"
VERSIONS_PATH="$INSTALL_PATH/versions"

# Fonction de logging
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

# Vérifier si le fichier de version existe
if [ ! -f "$VERSION_FILE" ]; then
    log "ERREUR: Fichier version non trouvé à $VERSION_FILE"

    # Essayer de détecter une version par défaut
    if [ -d "$VERSIONS_PATH" ]; then
        LATEST_VERSION=$(ls -1t "$VERSIONS_PATH" | head -1)
        if [ -n "$LATEST_VERSION" ]; then
            log "Utilisation de la version la plus récente: $LATEST_VERSION"
            TARGET_PATH="$VERSIONS_PATH/$LATEST_VERSION"

            if [ -d "$TARGET_PATH" ]; then
                rm -f "$CURRENT_LINK"
                ln -sf "$TARGET_PATH" "$CURRENT_LINK"
                log "Lien symbolique créé: $CURRENT_LINK -> $TARGET_PATH"
                exit 0
            fi
        fi
    fi

    log "ERREUR: Aucune version disponible trouvée"
    exit 1
fi

# Lire le tag actuel
CURRENT_TAG=$(cat "$VERSION_FILE" | grep -o '"currentTag": "[^"]*' | cut -d'"' -f4)

if [ -z "$CURRENT_TAG" ]; then
    log "ERREUR: Aucun tag actuel trouvé dans le fichier version"
    exit 1
fi

# Créer le lien symbolique vers la version courante
TARGET_PATH="$VERSIONS_PATH/$CURRENT_TAG"

if [ ! -d "$TARGET_PATH" ]; then
    log "ERREUR: Répertoire de version cible non trouvé: $TARGET_PATH"

    # Lister les versions disponibles pour diagnostic
    log "Versions disponibles:"
    if [ -d "$VERSIONS_PATH" ]; then
        ls -la "$VERSIONS_PATH" || log "Aucune version disponible"
    else
        log "Répertoire versions non trouvé: $VERSIONS_PATH"
    fi

    exit 1
fi

# Vérifier si le lien actuel pointe déjà vers la bonne version
if [ -L "$CURRENT_LINK" ]; then
    CURRENT_TARGET=$(readlink "$CURRENT_LINK")
    if [ "$CURRENT_TARGET" = "$TARGET_PATH" ]; then
        log "La version $CURRENT_TAG est déjà active"
        exit 0
    fi
fi

# Mettre à jour le lien symbolique
log "Mise à jour du lien symbolique vers la version: $CURRENT_TAG"
rm -f "$CURRENT_LINK"
ln -sf "$TARGET_PATH" "$CURRENT_LINK"

log "Version courante configurée: $CURRENT_TAG"
log "Lien symbolique créé: $CURRENT_LINK -> $TARGET_PATH"

# Vérifier que la nouvelle version est fonctionnelle
if [ -f "$CURRENT_LINK/server/package.json" ]; then
    log "Vérification de la version réussie"
else
    log "ATTENTION: La version configurée pourrait ne pas être complète"
fi
