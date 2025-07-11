# Scripts d'installation des drivers INDI

Ce répertoire contient plusieurs scripts pour l'installation des drivers INDI nécessaires au fonctionnement d'AirAstro.

## Architecture des scripts

### Scripts principaux

1. **`maintain-indi-drivers.sh`** - Script unifié de maintenance

   - Installe tous les drivers manquants
   - Met à jour les drivers existants
   - Peut configurer une mise à jour automatique quotidienne

2. **`install-on-rpi.sh`** - Script d'installation principal
   - Installe AirAstro complet sur Raspberry Pi
   - Appelle `maintain-indi-drivers.sh` pour installer tous les drivers
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
# Installation via le script principal
./install-on-rpi.sh

# Ou directement avec le script de maintenance
./maintain-indi-drivers.sh install-missing
./maintain-indi-drivers.sh update-all
```

### Installation minimale

```bash
# Uniquement les drivers essentiels
./maintain-indi-drivers.sh install-from-db
```

### Installation manuelle avancée

```bash
# D'abord les drivers essentiels
./install-drivers.sh

# Puis les drivers complets
./install-indi-drivers.sh full
```

## Ordre d'exécution recommandé

1. **`install-on-rpi.sh`** utilise `maintain-indi-drivers.sh`
2. **`maintain-indi-drivers.sh`** peut installer les drivers manquants puis mettre à jour l'ensemble

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
# Utiliser le script de maintenance
./maintain-indi-drivers.sh install-missing
./maintain-indi-drivers.sh update-all
```
