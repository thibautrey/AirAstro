#!/bin/bash

# Script d'initialisation des répertoires AirAstro
# Ce script peut être appelé par n'importe quel autre script pour s'assurer
# que l'environnement AirAstro est correctement configuré

set -e

# Charger les utilitaires communs
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/airastro-common.sh" ]; then
    source "$SCRIPT_DIR/airastro-common.sh"
else
    echo "Erreur: airastro-common.sh non trouvé" >&2
    exit 1
fi

# Fonction principale
main() {
    airastro_log "INFO" "Initialisation de l'environnement AirAstro"

    # Initialiser l'environnement complet
    if init_airastro_environment; then
        airastro_log "INFO" "Environnement AirAstro initialisé avec succès"

        # Afficher les informations sur les répertoires créés
        airastro_log "INFO" "Répertoires disponibles:"
        airastro_log "INFO" "  - Base: $AIRASTRO_BASE_PATH"
        airastro_log "INFO" "  - Versions: $AIRASTRO_VERSIONS_DIR"
        airastro_log "INFO" "  - Sauvegardes: $AIRASTRO_BACKUPS_DIR"
        airastro_log "INFO" "  - Logs: $AIRASTRO_LOGS_DIR"
        airastro_log "INFO" "  - Configuration: $AIRASTRO_CONFIG_DIR"

        return 0
    else
        airastro_log "ERROR" "Échec de l'initialisation de l'environnement AirAstro"
        return 1
    fi
}

# Exécuter si appelé directement
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    main "$@"
fi
