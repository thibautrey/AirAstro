# Scripts Core AirAstro

Ce dossier contient les scripts principaux et les fonctions communes d'AirAstro.

## Scripts disponibles

### `airastro-common.sh`

**Fonctions communes utilisées par tous les scripts**

- Fonctions de logging (`log_info`, `log_success`, `log_warning`, `log_error`)
- Fonctions utilitaires partagées
- Configuration commune

**Utilisation :**

```bash
source "$PROJECT_ROOT/scripts/core/airastro-common.sh"
```

### `start-airastro.sh`

**Script principal de démarrage du serveur AirAstro**

- Démarre le serveur Node.js
- Gère les processus en arrière-plan
- Vérifie les prérequis

**Utilisation :**

```bash
./core/start-airastro.sh
```

### `start-server.sh`

**Script alternatif de démarrage**

- Version simplifiée du démarrage
- Utilisé par les services systemd

### `build-server.sh`

**Script de construction du serveur**

- Compile le serveur TypeScript
- Installe les dépendances
- Prépare l'environnement de production

**Utilisation :**

```bash
./core/build-server.sh
```

### `airastro-version-manager.sh`

**Gestionnaire de versions AirAstro**

- Gère les versions du système
- Met à jour les configurations
- Maintient la compatibilité

### `setup-current-version.sh`

**Configuration de la version courante**

- Configure la version active
- Met à jour les fichiers de configuration
- Synchronise les versions

## Intégration

Ces scripts sont utilisés par :

- Les scripts de diagnostic
- Les scripts d'installation
- Les scripts de maintenance
- Les scripts spécifiques aux marques

## Fonctions communes disponibles

### Logging

- `log_info "message"` - Message d'information
- `log_success "message"` - Message de succès
- `log_warning "message"` - Message d'avertissement
- `log_error "message"` - Message d'erreur

### Utilitaires

- `check_root()` - Vérifie les privilèges root
- `check_command()` - Vérifie si une commande existe
- `backup_file()` - Sauvegarde un fichier
- `restore_file()` - Restaure un fichier

### Configuration

- `load_config()` - Charge la configuration AirAstro
- `save_config()` - Sauvegarde la configuration
- `get_version()` - Récupère la version courante

## Exemple d'utilisation

```bash
#!/bin/bash
set -e

# Source des fonctions communes
source "$(dirname "$0")/core/airastro-common.sh"

# Utilisation des fonctions
log_info "Démarrage du script"

if check_command "node"; then
    log_success "Node.js est disponible"
else
    log_error "Node.js n'est pas installé"
    exit 1
fi

log_info "Script terminé"
```
