# Système de Gestion des Drivers INDI - AirAstro

## Vue d'ensemble

Le système de gestion des drivers d'AirAstro permet de détecter, installer et gérer automatiquement les drivers INDI nécessaires pour votre équipement d'astronomie.

## Fonctionnalités

### 🔍 Détection automatique

- Détection des équipements USB connectés
- Identification automatique des drivers nécessaires
- Base de données étendue de plus de 80 équipements populaires

### 📦 Installation automatique

- Installation des drivers essentiels au démarrage
- Installation sur demande de drivers spécifiques
- Gestion des dépendances et des librairies
- Mise en place automatique du service `indi.service`

### 🔄 Mise à jour

- Vérification automatique des mises à jour
- Mise à jour en lot de tous les drivers
- Notification des nouvelles versions disponibles

### 🧹 Nettoyage

- Détection des drivers inutilisés
- Recommandations de nettoyage
- Optimisation de l'espace disque

## API Endpoints

### Statut des drivers

```
GET /api/drivers-management/status
```

Retourne le statut complet des drivers : disponibles, installés, recommandations.

### Drivers disponibles

```
GET /api/drivers-management/available
```

Liste tous les drivers disponibles dans les dépôts INDI.

### Drivers installés

```
GET /api/drivers-management/installed
```

Liste tous les drivers actuellement installés sur le système.

### Installation

```
POST /api/drivers-management/install/{driverName}
```

Installe un driver spécifique.

```
POST /api/drivers-management/install-equipment/{equipmentName}
```

Installe tous les drivers nécessaires pour un équipement donné.

```
POST /api/drivers-management/install-recommended
```

Installe tous les drivers recommandés basés sur l'équipement détecté.

### Mises à jour

```
GET /api/drivers-management/updates
```

Vérifie les mises à jour disponibles.

```
POST /api/drivers-management/update-all
```

Met à jour tous les drivers installés.

```
POST /api/drivers-management/update-database
```

Force la mise à jour de la base de données d'équipements.

### Nettoyage

```
GET /api/drivers-management/cleanup
```

Retourne la liste des drivers inutilisés.

### Vérification

```
GET /api/drivers-management/check/{driverName}
```

Vérifie si un driver spécifique est installé.

## Drivers Essentiels

Le système installe automatiquement les drivers suivants :

### 📸 Caméras

- **indi-asi** : Caméras ZWO ASI
- **indi-qhy** : Caméras QHY
- **indi-gphoto** : Appareils photo Canon, Nikon, etc.
- **indi-playerone** : Caméras Player One Astronomy
- **indi-svbony** : Caméras SVBONY
- **indi-toupbase** : Famille ToupTek

### 🔭 Montures

- **indi-eqmod** : Montures Sky-Watcher, etc.
- **indi-celestronaux** : Montures Celestron

### 🎛️ Accessoires

- **indi-asi-power** : Alimentations et focusers ASI
- **indi-gpsd** : Support GPS
- **indi-aagcloudwatcher-ng** : Capteur nuages AAG

### 📚 Librairies

- **libasi** : Librairie ZWO ASI
- **libqhy** : Librairie QHY
- **libplayerone** : Librairie Player One
- **libsvbony** : Librairie SVBONY
- **libtoupcam** : Librairie ToupTek

## Scripts d'installation

### Installation manuelle des drivers

```bash
# Exécuter le script d'installation
./scripts/install-drivers.sh
```

### Démarrage avec vérification

```bash
# Démarrer le serveur avec vérification des dépendances
./scripts/start-airastro.sh
```

## Base de données d'équipements

La base de données contient plus de 80 équipements populaires avec :

- Identification par ID USB (Vendor:Product)
- Mapping vers les drivers INDI appropriés
- Aliases et noms alternatifs
- Informations sur les fabricants et modèles

### Équipements supportés

#### Caméras ZWO ASI

- ASI120MC/MM, ASI178MC/MM, ASI290MC/MM
- ASI294MC Pro, ASI533MC Pro
- ASI2600MC Pro, ASI6200MC Pro

#### Caméras QHY

- QHY5III-290M, QHY268M, QHY294C, QHY600M

#### Appareils photo

- Canon DSLR (tous modèles)
- Nikon DSLR (tous modèles)

#### Montures

- Celestron CGX/CGX-L/CGEM II
- Sky-Watcher EQ6-R/HEQ5 Pro

#### Autres fabricants

- Player One Astronomy
- ToupTek
- Finger Lakes Instruments
- SBIG
- Starlight Express
- Apogee
- Moravian Instruments

## Configuration

### Variables d'environnement

```bash
# Port du serveur (optionnel)
PORT=3000

# Répertoire des données (optionnel)
DATA_DIR=/path/to/data
```

### Permissions

Le système nécessite des permissions sudo pour :

- Installation des paquets APT
- Accès aux périphériques USB
- Gestion des services système

## Logs et débogage

### Logs d'installation

```bash
# Consulter les logs d'installation
tail -f /tmp/airastro-drivers-install.log
```

### Logs du serveur

```bash
# Logs du serveur en temps réel
tail -f logs/airastro-server.log
```

### Débogage

```bash
# Lister les drivers installés
dpkg -l | grep indi-

# Vérifier les périphériques USB
lsusb

# Tester un driver
indiserver indi_simulator_telescope
```

## Dépannage

### Problèmes courants

#### Driver non trouvé

```bash
# Mettre à jour la liste des paquets
sudo apt-get update

# Rechercher le driver
apt-cache search indi-
```

#### Permissions insuffisantes

```bash
# Ajouter l'utilisateur au groupe dialout
sudo usermod -a -G dialout $USER

# Redémarrer la session
```

#### Conflit de drivers

```bash
# Arrêter tous les services INDI
sudo systemctl stop indi-*

# Redémarrer le serveur
sudo systemctl restart airastro
```

### Support

Pour obtenir de l'aide :

1. Consultez les logs d'erreur
2. Vérifiez la documentation INDI officielle
3. Utilisez l'API de diagnostic intégrée
4. Contactez le support AirAstro

## Roadmap

### Prochaines fonctionnalités

- [ ] Interface graphique de gestion des drivers
- [ ] Détection automatique des équipements
- [ ] Profils d'équipement prédéfinis
- [ ] Sauvegarde et restauration de configuration
- [ ] Gestion des versions multiples de drivers
- [ ] Support pour d'autres distributions Linux
