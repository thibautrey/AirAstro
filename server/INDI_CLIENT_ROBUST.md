# Client INDI Robuste pour AirAstro

## Vue d'ensemble

Cette implémentation fournit un client INDI robuste et prêt pour la production, basé sur les meilleures pratiques décrites dans le guide INDI. Elle remplace l'ancienne approche basée sur les outils en ligne de commande par une communication TCP/XML directe.

## Avantages par rapport à l'ancienne implémentation

### Ancienne approche (outils CLI)

- ❌ **Performance** : Chaque appel créait un nouveau processus
- ❌ **Pas de cache** : Pas de cache des propriétés des appareils
- ❌ **Pas de notifications** : Pas d'écoute des changements d'état temps réel
- ❌ **Pas de reconnexion** : Pas de gestion automatique des déconnexions
- ❌ **Fragile** : Dépendant des outils externes installés

### Nouvelle approche (TCP/XML direct)

- ✅ **Performance** : Communication directe via TCP
- ✅ **Cache intelligent** : Arbre de propriétés maintenu en mémoire
- ✅ **Notifications temps réel** : Événements pour tous les changements
- ✅ **Reconnexion automatique** : Gestion robuste des déconnexions
- ✅ **Autonome** : Pas de dépendance externe

## Architecture

### Couche de base : `IndiClient`

```typescript
const client = new IndiClient("localhost", 7624);
await client.connect();

// Écoute des événements
client.on("propertyUpdated", (device, property, prop) => {
  console.log(`${device}.${property} = ${prop.state}`);
});

// Commandes de base
await client.setProp("CCD", "CCD_EXPOSURE", { CCD_EXPOSURE_VALUE: "10" });
```

### Couche d'abstraction : Classes d'appareils

```typescript
const camera = new IndiCamera(client, "CCD Simulator");
await camera.connect();
await camera.startExposure(10);
await camera.setTemperature(-20);
```

### Couche de contrôle : `IndiController`

```typescript
const controller = new IndiController();
await controller.connect();
await controller.runImagingSequence([
  {
    ra: 5.5,
    dec: -5.4,
    exposures: [{ duration: 300, filter: 1, count: 5 }],
  },
]);
```

## Fonctionnalités principales

### 1. Gestion robuste des connexions

- Reconnexion automatique avec back-off exponentiel
- Détection de perte de connexion (timeout, erreurs XML)
- Replay automatique de l'état désiré après reconnexion

### 2. Cache intelligent des propriétés

- Arbre de propriétés maintenu en mémoire
- Mise à jour temps réel via les événements XML
- Accès instantané aux valeurs sans appel réseau

### 3. Gestion des événements

- Événements pour toutes les transitions d'état
- Notifications des messages des drivers
- Gestion des erreurs et alertes

### 4. Classes d'appareils de haut niveau

- `IndiCamera` : Expositions, température, binning, ROI
- `IndiMount` : Pointage, suivi, park/unpark
- `IndiFocuser` : Déplacement absolu/relatif, autofocus
- `IndiFilterWheel` : Changement de filtres

### 5. Séquences d'imagerie automatisées

- Pointage automatique vers les cibles
- Autofocus avant chaque série
- Gestion des filtres et expositions multiples
- Gestion des erreurs et reprise automatique

## Utilisation dans le serveur AirAstro

### Intégration dans les routes Express

```typescript
// routes/imaging.ts
import { IndiController } from "../services/indi-controller";

const controller = new IndiController();

app.post("/api/imaging/start", async (req, res) => {
  try {
    await controller.connect();
    const { targets } = req.body;
    await controller.runImagingSequence(targets);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### WebSocket pour les notifications temps réel

```typescript
// services/websocket.ts
import { IndiController } from "./indi-controller";

const controller = new IndiController();

controller.client.on("propertyUpdated", (device, property, prop) => {
  // Diffuser aux clients WebSocket
  io.emit("indi-update", { device, property, state: prop.state });
});
```

## Configuration et déploiement

### Prérequis

- Serveur INDI en cours d'exécution (port 7624 par défaut)
- Drivers INDI installés pour vos appareils
- Node.js avec support TypeScript

### Variables d'environnement

```bash
INDI_HOST=localhost
INDI_PORT=7624
INDI_RECONNECT_ATTEMPTS=10
INDI_RECONNECT_DELAY=1000
```

### Installation

```bash
cd server
npm install @xmldom/xmldom
npm install --save-dev @types/xmldom
```

## Exemple de séquence complète

```typescript
import { IndiController } from "./services/indi-controller";

async function observingSession() {
  const controller = new IndiController();

  try {
    // Connexion et initialisation
    await controller.connect();
    await controller.connectAllDevices();

    // Séquence d'imagerie multi-cibles
    const targets = [
      {
        ra: 5.5,
        dec: -5.4, // Orion
        exposures: [
          { duration: 300, filter: 1, count: 10 }, // Luminance
          { duration: 180, filter: 2, count: 5 }, // Rouge
          { duration: 180, filter: 3, count: 5 }, // Vert
          { duration: 180, filter: 4, count: 5 }, // Bleu
        ],
      },
      {
        ra: 6.8,
        dec: 38.3, // M42
        exposures: [{ duration: 120, filter: 1, count: 20 }],
      },
    ];

    await controller.runImagingSequence(targets);
  } catch (error) {
    console.error("Erreur lors de la session:", error);
  } finally {
    await controller.disconnect();
  }
}
```

## Gestion des erreurs et monitoring

### Logs structurés

```typescript
// Tous les événements INDI sont loggés
client.on("propertyUpdated", (device, property, prop) => {
  logger.info("INDI property updated", { device, property, state: prop.state });
});

client.on("error", (error) => {
  logger.error("INDI error", { error: error.message });
});
```

### Métriques et monitoring

```typescript
// Intégration avec Prometheus/Grafana
const metrics = {
  connections: new Counter("indi_connections_total"),
  errors: new Counter("indi_errors_total"),
  exposures: new Counter("indi_exposures_total"),
  reconnects: new Counter("indi_reconnects_total"),
};
```

## Migration depuis l'ancienne version

### Avant

```typescript
const client = new IndiClient();
const value = await client.getProp("CCD.CCD_EXPOSURE.CCD_EXPOSURE_VALUE");
await client.setProp("CCD.CCD_EXPOSURE.CCD_EXPOSURE_VALUE", "10");
```

### Après

```typescript
const client = new IndiClient();
await client.connect();

// Approche de bas niveau
const value = await client.getProp("CCD", "CCD_EXPOSURE", "CCD_EXPOSURE_VALUE");
await client.setProp("CCD", "CCD_EXPOSURE", { CCD_EXPOSURE_VALUE: "10" });

// Approche de haut niveau (recommandée)
const camera = new IndiCamera(client, "CCD");
await camera.startExposure(10);
```

## Prochaines étapes

1. **Tests unitaires** : Ajouter des tests pour tous les composants
2. **Simulation** : Créer un simulateur INDI pour les tests
3. **Documentation API** : Documenter toutes les méthodes publiques
4. **Intégration CI/CD** : Automatiser les tests et déploiements
5. **Monitoring** : Ajouter des métriques et alertes
6. **Interface Web** : Créer une interface pour contrôler les appareils

Cette implémentation robuste vous donne une base solide pour construire des applications d'astrophotographie professionnelles avec INDI.
