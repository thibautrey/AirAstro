# Scripts INDI

Ce dossier contient tous les scripts de gestion des drivers INDI (Instrument-Neutral Distributed Interface).

## Scripts disponibles

### `indi-manager.sh`

**Gestionnaire principal INDI avec menu interactif**

- Menu interactif pour toutes les opérations INDI
- Diagnostic automatique
- Installation et réparation guidée

**Utilisation :**

```bash
./indi/indi-manager.sh
```

### `diagnose-indi-system.sh`

**Diagnostic complet du système INDI**

- Vérifie l'installation des drivers
- Teste la connectivité
- Identifie les problèmes de configuration

**Utilisation :**

```bash
./indi/diagnose-indi-system.sh
```

### `install-indi-drivers.sh`

**Installation des drivers INDI**

- Installe les drivers INDI nécessaires
- Configure les dépendances
- Gère les différentes architectures

**Utilisation :**

```bash
./indi/install-indi-drivers.sh
```

### `maintain-indi-drivers.sh`

**Maintenance des drivers INDI**

- Met à jour les drivers existants
- Nettoie les installations corrompues
- Optimise les performances

**Utilisation :**

```bash
./indi/maintain-indi-drivers.sh
```

### `clean-indi-system.sh`

**Nettoyage du système INDI**

- Supprime les drivers non utilisés
- Nettoie les fichiers temporaires
- Remet à zéro la configuration

**Utilisation :**

```bash
./indi/clean-indi-system.sh
```

### `startup-drivers.sh`

**Démarrage automatique des drivers**

- Démarre les drivers au boot
- Gère les dépendances entre drivers
- Surveille l'état des drivers

**Utilisation :**

```bash
./indi/startup-drivers.sh
```

## Drivers INDI supportés

### Caméras

- **ASI** - Caméras ZWO ASI (toutes séries)
- **QHY** - Caméras QHY
- **Canon** - Appareils photo Canon DSLR
- **Nikon** - Appareils photo Nikon DSLR
- **Simulator** - Simulateur de caméra

### Montures

- **EQMod** - Montures compatibles ASCOM
- **Celestron** - Montures Celestron
- **Skywatcher** - Montures Sky-Watcher
- **10Micron** - Montures 10Micron

### Accessoires

- **Focuser** - Mise au point automatique
- **Filter Wheel** - Roue à filtres
- **Dome** - Contrôle de coupole
- **Weather** - Station météo

## Diagnostic automatique

Le système de diagnostic vérifie :

- ✅ Installation des packages INDI
- ✅ Présence des drivers
- ✅ Configuration des permissions
- ✅ Connectivité USB/Série
- ✅ Conflits de drivers
- ✅ État des services

## Résolution des problèmes

### Problèmes courants

1. **Driver non trouvé**

   ```bash
   ./indi/install-indi-drivers.sh
   ```

2. **Permissions insuffisantes**

   ```bash
   sudo usermod -a -G dialout $USER
   ```

3. **Conflit de drivers**

   ```bash
   ./indi/clean-indi-system.sh
   ```

4. **Service INDI non démarré**
   ```bash
   sudo systemctl start indiserver
   ```

### Logs et diagnostic

```bash
# Voir les logs INDI
journalctl -u indiserver

# Diagnostic rapide
./indi/diagnose-indi-system.sh

# Menu interactif
./indi/indi-manager.sh
```

## Architecture INDI

```
INDI Server (indiserver)
    ├── Driver ASI (indi_asi_ccd)
    ├── Driver QHY (indi_qhy_ccd)
    ├── Driver EQMod (indi_eqmod_telescope)
    └── Driver Focuser (indi_focuser)
        ↓
    Client Applications
    ├── KStars/Ekos
    ├── AirAstro Web Interface
    └── INDI Web Manager
```

## Configuration

### Fichiers de configuration

- `/etc/indi/` - Configuration globale
- `~/.indi/` - Configuration utilisateur
- `/tmp/indi_*.xml` - Fichiers temporaires

### Ports par défaut

- **7624** - Port INDI principal
- **8624** - Port INDI Web Manager
- **8080** - Port AirAstro (si configuré)

## Intégration AirAstro

Les scripts INDI sont intégrés dans :

- Interface web AirAstro
- Détection automatique d'équipements
- Configuration automatique
- Monitoring en temps réel

## Maintenance régulière

```bash
# Vérification hebdomadaire
./indi/diagnose-indi-system.sh

# Mise à jour mensuelle
./indi/maintain-indi-drivers.sh

# Nettoyage si nécessaire
./indi/clean-indi-system.sh
```
