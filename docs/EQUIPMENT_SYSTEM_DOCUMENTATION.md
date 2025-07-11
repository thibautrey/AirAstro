# Système de Détection d'Équipements AirAstro

## Vue d'ensemble

Le système de détection d'équipements AirAstro a été entièrement refondu pour utiliser une base de données dynamique et complète des drivers INDI, permettant la détection automatique de tous les équipements d'astronomie compatibles.

## Fonctionnalités principales

### 🔄 Base de données dynamique

- **Base complète** : Télécharge automatiquement la liste complète des drivers INDI depuis GitHub
- **Deux sources** :
  - [INDI Core](https://github.com/indilib/indi/tree/master/drivers) - Drivers officiels
  - [INDI 3rd Party](https://github.com/indilib/indi-3rdparty) - Drivers tiers
- **Mise à jour automatique** : Mise à jour quotidienne via systemd
- **Fonctionnement offline** : Utilise la base locale après une première synchronisation

### 🎯 Détection automatique

- **Détection USB** : Scan automatique des périphériques USB avec mapping VID/PID
- **Détection série** : Identification des ports série
- **Détection réseau** : Découverte des équipements en réseau
- **Types supportés** : Mount, Camera, Focuser, Filter-wheel, Guide-camera, Dome, Weather, Aux

### 📡 Polling intelligent

- **Polling conditionnel** : Actif uniquement sur la page de configuration
- **Interval configurable** : 30 secondes par défaut
- **Détection en temps réel** : Détecte les connexions/déconnexions à chaud

### 🔧 Installation automatique

- **Détection des drivers** : Identifie automatiquement les drivers nécessaires
- **Installation automatique** : Installe les packages INDI appropriés
- **Configuration auto** : Configure les drivers avec les paramètres optimaux

## Architecture

```
┌─────────────────────────────────────────────┐
│                Frontend                     │
│  ┌─────────────────────────────────────────┐│
│  │     useEquipment Hook                   ││
│  │  - Polling conditionnel                 ││
│  │  - État des équipements                 ││
│  │  - Actions (setup, restart, etc.)      ││
│  └─────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│                Backend                      │
│  ┌─────────────────────────────────────────┐│
│  │      Equipment Manager Service          ││
│  │  - Monitoring continu                   ││
│  │  - Gestion des statuts                  ││
│  │  - Configuration automatique            ││
│  └─────────────────────────────────────────┘│
│                      │                      │
│  ┌─────────────────────────────────────────┐│
│  │    Equipment Detector Service           ││
│  │  - Détection USB/Série/Réseau          ││
│  │  - Identification des équipements       ││
│  │  - Mapping avec la base de données      ││
│  └─────────────────────────────────────────┘│
│                      │                      │
│  ┌─────────────────────────────────────────┐│
│  │    Equipment Database Service           ││
│  │  - Base de données dynamique            ││
│  │  - Téléchargement depuis GitHub         ││
│  │  - Cache local avec fallback            ││
│  └─────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

## Configuration

### Variables d'environnement

```bash
# Configuration du serveur
PORT=3000
NODE_ENV=production

# Configuration de la base de données
EQUIPMENT_DB_UPDATE_INTERVAL=24h
EQUIPMENT_DB_CACHE_PATH=/opt/airastro/data
EQUIPMENT_DB_GITHUB_TOKEN=optional
```

### Fichiers de configuration

- `server/src/data/equipment-database.json` : Cache local de la base de données
- `server/config/equipment.env` : Configuration spécifique aux équipements

## Installation

### 1. Installation initiale

```bash
# Installer les dépendances
cd server
npm install

# Initialiser la base de données
./scripts/setup-equipment-database.sh
```

### 2. Configuration automatique (Raspberry Pi)

```bash
# Avec privilèges root pour créer les services systemd
sudo ./scripts/setup-equipment-database.sh
```

### 3. Mise à jour manuelle

```bash
# Forcer la mise à jour de la base de données
./scripts/update-equipment-database.sh
```

## API REST

### Endpoints principaux

#### GET `/api/equipment`

Retourne la liste complète des équipements détectés avec leurs statuts.

**Response:**

```json
{
  "equipment": [
    {
      "id": "usb-03c3:120a",
      "name": "ASI120MC",
      "type": "camera",
      "manufacturer": "ZWO",
      "model": "ASI120MC",
      "connection": "usb",
      "driverStatus": "installed",
      "status": "connected",
      "confidence": 95
    }
  ],
  "totalCount": 1,
  "connectedCount": 1,
  "isMonitoring": true
}
```

#### POST `/api/equipment/auto-setup`

Lance la configuration automatique de tous les équipements détectés.

#### POST `/api/equipment/database/update`

Force la mise à jour de la base de données d'équipements.

#### GET `/api/equipment/database/stats`

Retourne les statistiques de la base de données.

**Response:**

```json
{
  "totalEquipment": 1247,
  "byType": {
    "camera": 456,
    "mount": 123,
    "focuser": 89,
    "dome": 34,
    "weather": 67,
    "aux": 478
  },
  "byManufacturer": {
    "ZWO": 45,
    "QHY": 38,
    "Celestron": 23,
    "Canon": 12
  },
  "lastUpdate": "2025-01-10T14:30:00Z"
}
```

## Tests

### Test complet du système

```bash
# Tester tous les composants
./scripts/test-complete-equipment-system.sh

# Tester avec un serveur spécifique
./scripts/test-complete-equipment-system.sh --server-url http://airastro.local:3000
```

### Tests unitaires

```bash
# Tester la base de données
node -e "
const { EquipmentDatabaseService } = require('./src/services/equipment-database.service');
const service = new EquipmentDatabaseService();
service.initializeDatabase().then(() => console.log('✅ OK'));
"

# Tester la détection
./scripts/test-equipment-detection.sh
```

## Utilisation dans le Frontend

### Hook useEquipment

```tsx
import { useEquipment } from "../hooks/useEquipment";

function EquipmentSetup() {
  const {
    equipment,
    summary,
    loading,
    error,
    refreshEquipment,
    performAutoSetup,
    forceUpdateDatabase,
  } = useEquipment({
    enablePolling: true,
    pollingInterval: 30000,
  });

  // Polling actif uniquement sur cette page
  // Actualisation automatique toutes les 30 secondes

  return (
    <div>
      {equipment.map((device) => (
        <EquipmentCard key={device.id} device={device} />
      ))}

      <button onClick={performAutoSetup}>Configuration automatique</button>

      <button onClick={forceUpdateDatabase}>
        Mettre à jour la base de données
      </button>
    </div>
  );
}
```

## Monitoring et Logs

### Logs système

```bash
# Logs du service principal
journalctl -u airastro -f

# Logs de mise à jour de la base de données
journalctl -u airastro-db-update -f

# Logs de détection
tail -f /var/log/airastro/equipment-detection.log
```

### Monitoring systemd

```bash
# Statut du service de mise à jour
systemctl status airastro-db-update.timer

# Prochaine exécution
systemctl list-timers airastro-db-update.timer
```

## Dépannage

### Problèmes courants

#### 1. Base de données vide

```bash
# Vérifier la connexion Internet
curl -I https://api.github.com

# Forcer la mise à jour
./scripts/update-equipment-database.sh
```

#### 2. Équipements non détectés

```bash
# Vérifier les périphériques USB
lsusb

# Tester la détection
./scripts/test-equipment-detection.sh
```

#### 3. Drivers non installés

```bash
# Vérifier les drivers INDI
dpkg -l | grep indi-

# Installer manuellement
sudo apt install indi-asi indi-qhy indi-celestron
```

### Logs de débogage

```bash
# Activer les logs détaillés
export DEBUG=airastro:equipment*
node src/index.js

# Logs de détection USB
export DEBUG=airastro:usb*
```

## Mise à jour du système

### Mise à jour de la base de données

La base de données est mise à jour automatiquement :

- **Quotidiennement** via systemd timer
- **Au démarrage** si plus de 24h depuis la dernière mise à jour
- **Manuellement** via API ou script

### Mise à jour du code

```bash
# Arrêter le service
sudo systemctl stop airastro

# Mettre à jour le code
git pull origin main
npm install

# Relancer le service
sudo systemctl start airastro
```

## Contribution

### Structure des données

La base de données utilise le format suivant :

```typescript
interface EquipmentDatabase {
  [vendorProduct: string]: {
    name: string;
    type:
      | "mount"
      | "camera"
      | "focuser"
      | "filter-wheel"
      | "guide-camera"
      | "dome"
      | "weather"
      | "aux"
      | "unknown";
    manufacturer: string;
    model: string;
    driverName: string;
    packageName: string;
    autoInstallable: boolean;
    aliases: string[];
    description?: string;
    category: string;
    lastUpdated: string;
  };
}
```

### Ajouter un nouvel équipement

Les équipements sont automatiquement détectés depuis les dépôts INDI. Pour ajouter un mapping USB spécifique :

```typescript
// Dans buildUsbMappings()
'03c3:abcd': {
  name: 'Mon Équipement',
  type: 'camera',
  manufacturer: 'MonFabricant',
  model: 'MonModèle',
  driverName: 'indi-mon-driver',
  packageName: 'indi-mon-driver',
  autoInstallable: true,
  aliases: ['mon-alias'],
  category: 'ccd',
  lastUpdated: new Date().toISOString()
}
```

## Limitations et améliorations futures

### Limitations actuelles

- La détection réseau est basique
- Certains drivers propriétaires ne sont pas dans les dépôts INDI
- La détection série nécessite parfois une configuration manuelle

### Améliorations prévues

- Détection Bluetooth
- Support des drivers propriétaires
- Interface de configuration avancée
- Profils d'équipements personnalisés
- Export/import de configurations

## Filtrage des Équipements

### 🧹 Filtrage Automatique

Le système filtre automatiquement les équipements inconnus et peu fiables pour améliorer la qualité de l'interface :

- **Équipements filtrés** : Type "unknown" avec confiance < 50
- **Contrôleurs génériques** : Hubs USB, adaptateurs, bridges
- **Appareils série non identifiés** : Ports série génériques

### 🎛️ Contrôle du Filtrage

```typescript
// Affichage par défaut (équipements pertinents uniquement)
const { equipment } = useEquipment({
  enablePolling: true,
});

// Affichage de tous les équipements
const { equipment } = useEquipment({
  enablePolling: true,
  includeUnknown: true,
});
```

### 🔍 API REST

```bash
# Équipements filtrés (par défaut)
curl http://airastro.local:3000/api/equipment

# Tous les équipements
curl http://airastro.local:3000/api/equipment?includeUnknown=true
```
