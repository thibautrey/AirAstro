# Système de Détection Automatique d'Équipements AirAstro

## Vue d'ensemble

Le système de détection automatique d'équipements AirAstro permet de détecter, installer et configurer automatiquement les équipements d'astronomie connectés au Raspberry Pi, sans intervention manuelle de l'utilisateur.

## Fonctionnalités

### 🔍 Détection Automatique
- **Détection USB** : Identification automatique des caméras, montures et accessoires USB
- **Détection série** : Reconnaissance des appareils connectés via ports série
- **Détection réseau** : Découverte d'équipements réseau via mDNS/Bonjour
- **Base de données d'équipements** : Correspondance automatique avec les drivers INDI appropriés

### 🔧 Installation Automatique
- **Drivers INDI** : Installation automatique des drivers nécessaires
- **Gestion des dépendances** : Résolution et installation des dépendances
- **Configuration des permissions** : Configuration automatique des permissions USB/série
- **Mise à jour automatique** : Mise à jour des drivers et du système

### 📊 Monitoring en Temps Réel
- **Surveillance continue** : Monitoring des équipements toutes les 30 secondes
- **Notifications de changement** : Alertes lors de connexion/déconnexion
- **Statut des drivers** : Suivi de l'état des drivers (installé, en cours, arrêté)
- **Rapports détaillés** : Logs et rapports de configuration

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Frontend Web                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ EquipmentSetup  │  │ EquipmentCard   │  │ useEquipment    │ │
│  │ Component       │  │ Component       │  │ Hook            │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTP API
                                │
┌─────────────────────────────────────────────────────────────────┐
│                       Backend Server                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Equipment       │  │ Equipment       │  │ Auto Config     │ │
│  │ Routes          │  │ Manager Service │  │ Service         │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                │                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Equipment       │  │ Driver          │  │ INDI            │ │
│  │ Detector        │  │ Manager         │  │ Drivers         │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ System calls
                                │
┌─────────────────────────────────────────────────────────────────┐
│                      System Layer                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ USB Devices     │  │ Serial Ports    │  │ Network         │ │
│  │ (lsusb)         │  │ (/dev/tty*)     │  │ (mDNS)          │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Équipements Pris en Charge

### Caméras
- **ZWO ASI** : Toutes les caméras ZWO ASI (ASI120, ASI178, ASI294, ASI2600, etc.)
- **QHY** : Caméras QHYCCD (QHY5III, QHY268, etc.)
- **Canon DSLR** : Appareils photo Canon compatibles
- **Nikon DSLR** : Appareils photo Nikon compatibles

### Montures
- **Celestron** : CGX, CGX-L, CGEM II, NexStar
- **Sky-Watcher** : EQ6-R, HEQ5 Pro, AZ-GTe
- **Orion** : Montures compatibles EQMod
- **Takahashi** : Montures Takahashi

### Accessoires
- **Focuseurs** : Focuseurs compatibles INDI
- **Roues à filtres** : Roues à filtres automatiques
- **Stations météo** : Stations météo compatibles

## Installation

### Prérequis

1. **Raspberry Pi** avec Raspberry Pi OS
2. **Accès sudo** pour l'installation des packages
3. **Connexion Internet** pour télécharger les drivers

### Installation Automatique

Exécutez le script d'installation :

```bash
cd /path/to/airastro/server
chmod +x scripts/install-indi-drivers.sh
./scripts/install-indi-drivers.sh
```

### Installation Manuelle

1. Installer les dépendances :
```bash
sudo apt-get update
sudo apt-get install -y libindi1 indi-bin indi-data
```

2. Installer les drivers courants :
```bash
sudo apt-get install -y indi-asi indi-qhy indi-gphoto indi-eqmod indi-celestron
```

3. Configurer les permissions :
```bash
sudo usermod -a -G dialout $USER
sudo usermod -a -G indi $USER
```

## Utilisation

### Interface Web

1. **Accès** : Connectez-vous à l'interface web AirAstro
2. **Configuration** : Allez dans l'écran "Configuration de l'équipement"
3. **Scan automatique** : Cliquez sur "Scanner" pour détecter les équipements
4. **Configuration automatique** : Cliquez sur "Auto Config" pour configurer automatiquement

### API REST

#### Lister les équipements
```bash
curl http://airastro.local:3000/api/equipment
```

#### Configuration automatique
```bash
curl -X POST http://airastro.local:3000/api/equipment/auto-setup
```

#### Configurer un équipement spécifique
```bash
curl -X POST http://airastro.local:3000/api/equipment/{device-id}/setup
```

### Monitoring

Le système surveille automatiquement les équipements et met à jour leur statut :

- **Connecté** : Équipement détecté et driver actif
- **Déconnecté** : Équipement détecté mais driver inactif
- **Erreur** : Problème avec l'équipement ou le driver
- **Configuration** : Équipement en cours de configuration

## Dépannage

### Problèmes Courants

#### Équipement non détecté
1. Vérifier la connexion USB/série
2. Redémarrer le scan : `POST /api/equipment/scan`
3. Vérifier les logs : `/var/log/airastro-autoconfig.log`

#### Driver non installé
1. Installation manuelle : `sudo apt-get install indi-{driver-name}`
2. Vérifier les dépôts : `apt-cache search indi-`
3. Redémarrer la configuration : `POST /api/equipment/system-setup`

#### Permissions refusées
1. Vérifier les groupes : `groups`
2. Ajouter aux groupes : `sudo usermod -a -G indi,dialout $USER`
3. Redémarrer la session ou le système

### Logs et Diagnostics

#### Logs du serveur
```bash
journalctl -u airastro.service -f
```

#### Logs de configuration
```bash
tail -f /var/log/airastro-autoconfig.log
```

#### Statut des services
```bash
systemctl status indi.service
systemctl status airastro.service
```

#### Diagnostic USB
```bash
lsusb -v
dmesg | grep -i usb
```

## Développement

### Ajouter un Nouveau Équipement

1. **Identifier les IDs** : Trouvez les vendor:product IDs avec `lsusb`
2. **Ajouter à la base de données** : Éditez `equipment-detector.service.ts`
3. **Tester** : Utilisez l'API pour vérifier la détection

Exemple :
```typescript
'1234:5678': {
  name: 'Mon Équipement',
  type: 'camera',
  manufacturer: 'MonFabricant',
  model: 'MonModèle',
  driverName: 'indi-mon-driver',
  autoInstallable: true,
  aliases: ['mon-equipement', 'mon alias']
}
```

### Ajouter un Driver

1. **Créer le package** : Créez un package .deb pour votre driver
2. **Ajouter au dépôt** : Ajoutez le package aux dépôts INDI
3. **Tester l'installation** : Utilisez `apt-get install indi-{driver-name}`

### Tests

#### Tests unitaires
```bash
npm test
```

#### Tests d'intégration
```bash
npm run test:integration
```

#### Tests de détection
```bash
curl http://airastro.local:3000/api/equipment/scan
```

## Contribution

### Rapporter un Bug

1. Vérifiez les logs
2. Reproduisez le problème
3. Créez une issue GitHub avec :
   - Description du problème
   - Logs pertinents
   - Configuration système
   - Étapes de reproduction

### Ajouter un Équipement

1. Testez la détection
2. Ajoutez l'équipement à la base de données
3. Créez une pull request
4. Incluez les tests

## Licence

Ce projet est sous licence MIT. Voir le fichier LICENSE pour plus de détails.
