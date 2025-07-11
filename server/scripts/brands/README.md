# Scripts d'équipements par marque

Ce répertoire contient les scripts d'installation et de diagnostic pour différentes marques d'équipements astronomiques.

## Structure

```
brands/
├── asi/                    # ZWO ASI Cameras
│   ├── install-asi-python.sh      # Installation du support Python
│   ├── install-asi-complete.sh    # Installation complète
│   └── diagnose-asi.sh            # Diagnostic des problèmes
├── template/               # Template pour nouvelles marques
│   └── install-template.sh       # Template d'installation
└── README.md              # Ce fichier
```

## Utilisation

### Script principal

Le script principal `equipment-manager.sh` gère toutes les marques :

```bash
# Installer le support pour une marque
./equipment-manager.sh install asi

# Diagnostiquer les problèmes
./equipment-manager.sh diagnose asi

# Détecter automatiquement les équipements
./equipment-manager.sh detect

# Voir le statut général
./equipment-manager.sh status

# Lister les marques supportées
./equipment-manager.sh list
```

### Scripts spécifiques

Chaque marque peut avoir ses propres scripts :

```bash
# Installation complète ASI
./brands/asi/install-asi-complete.sh

# Diagnostic ASI
./brands/asi/diagnose-asi.sh

# Installation Python seulement
./brands/asi/install-asi-python.sh
```

## Marques supportées

### ZWO ASI

- **Répertoire**: `asi/`
- **Description**: Caméras ZWO ASI (ASI120MM, ASI294MC, etc.)
- **Scripts**:
  - `install-asi-complete.sh` - Installation complète (INDI + Python)
  - `install-asi-python.sh` - Installation du support Python uniquement
  - `diagnose-asi.sh` - Diagnostic des problèmes

### Futures marques

- **QHY**: Caméras QHY
- **Canon**: Appareils photo Canon DSLR
- **Nikon**: Appareils photo Nikon DSLR
- **Celestron**: Équipements Celestron
- **Sky-Watcher**: Équipements Sky-Watcher

## Ajouter une nouvelle marque

1. Créer un répertoire pour la marque : `mkdir brands/nouvelle-marque`
2. Copier le template : `cp brands/template/install-template.sh brands/nouvelle-marque/install-nouvelle-marque.sh`
3. Adapter le script selon la marque :
   - Modifier les vendor IDs USB
   - Adapter les paquets INDI
   - Configurer les dépendances spécifiques
   - Créer les règles udev appropriées
4. Ajouter la marque dans `equipment-manager.sh`

## Format des scripts

### Conventions de nommage

- `install-[marque]-complete.sh` - Installation complète
- `install-[marque]-python.sh` - Installation Python uniquement
- `diagnose-[marque].sh` - Diagnostic
- `test-[marque].sh` - Tests

### Structure recommandée

1. Vérifications préliminaires
2. Détection des équipements
3. Installation des dépendances système
4. Installation des drivers INDI
5. Installation du SDK/bibliothèques
6. Configuration des permissions
7. Installation des modules Python
8. Configuration des groupes utilisateur
9. Tests de l'installation
10. Création d'un script de test
11. Résumé final

### Fonctions communes

Utilisez les fonctions communes définies dans `airastro-common.sh` :

- `log_info "message"` - Message d'information
- `log_success "message"` - Message de succès
- `log_warning "message"` - Message d'avertissement
- `log_error "message"` - Message d'erreur

## Dépannage

### Problèmes courants

1. **Permissions** : Vérifiez que l'utilisateur est dans les groupes `plugdev` et `dialout`
2. **Règles udev** : Vérifiez que les règles udev sont créées et rechargées
3. **Drivers INDI** : Vérifiez que les drivers INDI sont installés et fonctionnels
4. **SDK** : Vérifiez que les bibliothèques natives sont installées

### Diagnostic

```bash
# Diagnostic général
./equipment-manager.sh detect

# Diagnostic spécifique à une marque
./equipment-manager.sh diagnose asi

# Statut complet
./equipment-manager.sh status
```

## Intégration avec AirAstro

Les scripts d'équipements sont intégrés dans le système AirAstro :

- Détection automatique lors du démarrage
- Configuration automatique des drivers INDI
- Interface web pour la gestion des équipements
- Logs centralisés pour le diagnostic

## Contribution

Pour contribuer une nouvelle marque :

1. Suivez le template fourni
2. Testez l'installation sur un système propre
3. Documentez les spécificités de la marque
4. Soumettez une pull request avec les tests

## Support

En cas de problème :

1. Exécutez le diagnostic : `./equipment-manager.sh diagnose [marque]`
2. Consultez les logs : `journalctl -u airastro`
3. Vérifiez les permissions : `groups`
4. Testez la détection USB : `lsusb`
