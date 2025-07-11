# Intégration Client INDI - AirAstro

## Vue d'ensemble

Ce document décrit la nouvelle architecture d'AirAstro qui utilise le client INDI pour communiquer avec les équipements d'astronomie au lieu de la détection USB directe.

## Architecture

### Ancienne approche (dépréciée)

```
AirAstro Server → libusb → Équipements USB → Détection manuelle
```

### Nouvelle approche (recommandée)

```
AirAstro Server → Client INDI → Serveur INDI → Drivers INDI → Équipements
```

## Avantages

1. **Standardisation** : Utilisation du protocole INDI standard
2. **Fiabilité** : Les drivers INDI sont testés et maintenus
3. **Fonctionnalités** : Accès à toutes les fonctionnalités avancées
4. **Compatibilité** : Support de tous les équipements INDI
5. **Évolutivité** : Facilité d'ajout de nouvelles fonctionnalités

## Utilisation

### Initialisation

```typescript
import { DriverManager } from "./indi";

const driverManager = new DriverManager("localhost", 7624);
```

### Obtenir les équipements connectés

```typescript
// Nouvelle méthode (recommandée)
const devices = await driverManager.listConnectedEquipment();

// Ancienne méthode (dépréciée)
const usbDevices = await driverManager.listUsbDevices();
```

### Connecter un équipement

```typescript
await driverManager.connectDevice("ZWO CCD ASI120MC-S");
```

### Prendre une photo

```typescript
await driverManager.captureImage("ZWO CCD ASI120MC-S", 5.0); // 5 secondes
```

### Bouger une monture

```typescript
await driverManager.moveMount("EQMod Mount", 12.5, 41.2); // RA: 12h30m, DEC: +41°12'
```

### Ajuster un focuser

```typescript
await driverManager.adjustFocuser("Focuser Simulator", 5000);
```

### Changer de filtre

```typescript
await driverManager.changeFilter("Filter Wheel", 2); // Filtre position 2
```

### Obtenir des informations météo

```typescript
const weather = await driverManager.getWeatherInfo("Weather Simulator");
console.log(`Température: ${weather.temperature}°C`);
console.log(`Humidité: ${weather.humidity}%`);
```

## Types de données

### IndiDevice

```typescript
interface IndiDevice {
  name: string; // Nom du device dans INDI
  label: string; // Nom affiché
  type:
    | "camera"
    | "mount"
    | "focuser"
    | "filterwheel"
    | "dome"
    | "weather"
    | "aux"
    | "unknown";
  driver: string; // Nom du driver
  connected: boolean; // État de connexion
  properties: IndiProperty[];
  brand?: string; // Marque détectée
  model?: string; // Modèle détecté
}
```

### IndiProperty

```typescript
interface IndiProperty {
  name: string; // Nom de la propriété
  label: string; // Nom affiché
  type: "text" | "number" | "switch" | "light" | "blob";
  value: any; // Valeur actuelle
  writable: boolean; // Peut être modifiée
  state: "idle" | "ok" | "busy" | "alert";
}
```

## Méthodes disponibles

### Gestion des équipements

- `listConnectedEquipment()` : Liste tous les équipements connectés
- `connectDevice(name)` : Connecte un équipement
- `disconnectDevice(name)` : Déconnecte un équipement
- `getDeviceProperty(name, property)` : Lit une propriété
- `setDeviceProperty(name, property, value)` : Définit une propriété

### Actions spécialisées

- `captureImage(camera, exposureTime)` : Prend une photo
- `moveMount(mount, ra, dec)` : Bouge une monture
- `adjustFocuser(focuser, position)` : Ajuste un focuser
- `changeFilter(filterWheel, slot)` : Change de filtre
- `getWeatherInfo(station)` : Obtient les infos météo

### Monitoring

- `getExposureStatus(camera)` : État d'exposition
- `getMountPosition(mount)` : Position de la monture
- `setMountTracking(mount, tracking)` : Active/désactive le suivi
- `setMountParking(mount, park)` : Parke/déparke la monture

### Serveur INDI

- `isIndiServerRunning()` : Vérifie si INDI est actif
- `getIndiServerStatus()` : Obtient le statut du serveur

## Migration depuis l'ancienne API

### Remplacement des méthodes

| Ancienne méthode             | Nouvelle méthode                           |
| ---------------------------- | ------------------------------------------ |
| `listUsbDevices()`           | `listConnectedEquipment()`                 |
| `detectConnectedEquipment()` | `detectConnectedEquipment()` (mise à jour) |
| Communication USB directe    | Communication via INDI                     |

### Exemple de migration

```typescript
// Ancien code
const usbDevices = await driverManager.listUsbDevices();
for (const device of usbDevices) {
  if (device.brand === "ZWO") {
    // Communication directe avec le périphérique
  }
}

// Nouveau code
const devices = await driverManager.listConnectedEquipment();
for (const device of devices) {
  if (device.brand === "ZWO" && device.type === "camera") {
    await driverManager.connectDevice(device.name);
    await driverManager.captureImage(device.name, 5.0);
  }
}
```

## Configuration requise

### Serveur INDI

Le serveur INDI doit être en cours d'exécution :

```bash
# Démarrer le serveur INDI
sudo systemctl start indi.service

# Vérifier le statut
sudo systemctl status indi.service

# Démarrer des drivers spécifiques
indiserver -v indi_asi_ccd indi_simulator_telescope
```

### Drivers INDI

Les drivers appropriés doivent être installés :

```bash
# Installer les drivers courants
sudo apt-get install indi-asi indi-qhy indi-eqmod

# Ou utiliser les scripts d'installation AirAstro
./scripts/indi/install-indi-drivers.sh
```

## Dépannage

### Problèmes courants

1. **Serveur INDI non accessible**

   ```bash
   # Vérifier que le serveur INDI est en cours d'exécution
   systemctl status indi.service

   # Vérifier la connectivité
   telnet localhost 7624
   ```

2. **Équipement non détecté**

   ```bash
   # Vérifier que les drivers sont installés
   dpkg -l | grep indi-

   # Vérifier les logs INDI
   journalctl -u indi.service
   ```

3. **Propriétés non accessibles**
   ```bash
   # Utiliser indi_getprop pour tester
   indi_getprop "*.CONNECTION.CONNECT"
   ```

### Logs et diagnostic

```typescript
// Vérifier le statut du serveur INDI
const status = await driverManager.getIndiServerStatus();
console.log("Serveur INDI:", status.running ? "✅ Actif" : "❌ Inactif");
console.log("Équipements connectés:", status.connectedDevices);

// Lister les équipements disponibles
const devices = await driverManager.listConnectedEquipment();
devices.forEach((device) => {
  console.log(
    `${device.name} (${device.type}): ${device.connected ? "✅" : "❌"}`
  );
});
```

## Prochaines étapes

1. **Migration progressive** : Remplacer les appels USB par INDI
2. **Tests** : Vérifier la compatibilité avec les équipements existants
3. **Documentation** : Mettre à jour la documentation API
4. **Interface utilisateur** : Adapter l'interface pour utiliser les nouvelles données
5. **Monitoring** : Améliorer le monitoring des équipements via INDI

## Ressources

- [Documentation INDI officielle](https://www.indilib.org/)
- [Drivers INDI supportés](https://www.indilib.org/devices.html)
- [Protocole INDI](https://www.indilib.org/develop/developer-manual.html)
- [Scripts d'installation AirAstro](./scripts/indi/README.md)
