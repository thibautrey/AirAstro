# Scripts d'installation des drivers INDI

Ce répertoire contient plusieurs scripts pour l'installation des drivers INDI nécessaires au fonctionnement d'AirAstro.

## Architecture des scripts

### Scripts principaux

1. **`install-all-drivers.sh`** - Script unifié (recommandé)

   - Combine l'installation des drivers essentiels et complets
   - Options : `--essential-only` ou `--full`
   - Utilisé par défaut dans `install-on-rpi.sh`

2. **`install-on-rpi.sh`** - Script d'installation principal
   - Installe AirAstro complet sur Raspberry Pi
   - Inclut l'installation des drivers INDI
   - Configure les services système

### Scripts de drivers individuels

3. **`install-drivers.sh`** - Drivers essentiels (133 lignes)

   - Installe uniquement les drivers de base les plus courants
   - Plus rapide, installations minimales
   - Paquets : indi-bin, libindi-dev, drivers caméras populaires

4. **`install-indi-drivers.sh`** - Installation complète (382 lignes)
   - Installe tous les drivers INDI disponibles
   - Plus complet, prend plus de temps
   - Inclut drivers spécialisés et moins courants

## Utilisation

### Installation complète (recommandé)

```bash
# Via le script unifié
./install-all-drivers.sh --full

# Via le script principal
./install-on-rpi.sh
```

### Installation minimale

```bash
# Uniquement les drivers essentiels
./install-all-drivers.sh --essential-only

# Ou directement
./install-drivers.sh
```

### Installation manuelle avancée

```bash
# D'abord les drivers essentiels
./install-drivers.sh

# Puis les drivers complets
./install-indi-drivers.sh full
```

## Ordre d'exécution recommandé

1. **`install-on-rpi.sh`** appelle automatiquement `install-all-drivers.sh`
2. **`install-all-drivers.sh`** exécute dans l'ordre :
   - `install-drivers.sh` (drivers essentiels)
   - `install-indi-drivers.sh full` (drivers complets)

## Logs et diagnostic

- Les logs d'installation sont disponibles dans `/tmp/`
- `install-drivers.sh` crée `/tmp/airastro-drivers-install.log`
- `install-indi-drivers.sh` crée ses propres logs détaillés

## Compatibilité

Tous les scripts sont compatibles avec :

- Ubuntu 18.04+
- Debian 10+
- Raspberry Pi OS (Raspbian)

## Maintenance

Pour mettre à jour les drivers :

```bash
# Réinstaller tous les drivers
./install-all-drivers.sh --full

# Ou utiliser le script de maintenance
./maintain-indi-drivers.sh
```
