# Contexte d'équipement - Documentation

## Vue d'ensemble

Le système de contexte d'équipement d'AirAstro permet de sauvegarder et synchroniser la sélection d'équipements entre le frontend et le backend. Cela garantit que même en cas de perte de connexion ou de rechargement de la page, la configuration des équipements est préservée.

## Architecture

### Frontend (React)

- **EquipmentContext** : Contexte React global pour gérer l'état des équipements sélectionnés
- **useEquipmentSync** : Hook personnalisé pour la synchronisation avec le serveur
- **useEquipmentContext** : Hook pour accéder au contexte d'équipement
- **EquipmentSyncStatus** : Composant d'affichage du statut de synchronisation

### Backend (Express)

- **equipment-context.service.ts** : Service pour gérer la persistance du contexte
- **equipment.route.ts** : Routes API pour les opérations CRUD sur le contexte
- **equipment-context.json** : Fichier de sauvegarde persistant

## Utilisation

### Récupérer le contexte d'équipement

```typescript
import { useEquipmentContext } from "../contexts/EquipmentContext";

function MyComponent() {
  const { selectedEquipment } = useEquipmentContext();

  // Accéder aux équipements sélectionnés
  const mount = selectedEquipment.mount;
  const camera = selectedEquipment.mainCamera;
  const guideCamera = selectedEquipment.guideCamera;

  return (
    <div>
      {mount && <p>Monture: {mount.name}</p>}
      {camera && <p>Caméra: {camera.name}</p>}
    </div>
  );
}
```

### Modifier le contexte d'équipement

```typescript
import { useEquipmentContext } from "../contexts/EquipmentContext";

function EquipmentSelector() {
  const { selectedEquipment, updateEquipment } = useEquipmentContext();

  const handleMountSelection = (mount: DetectedEquipment) => {
    updateEquipment({ mount });
  };

  const handleCameraSelection = (camera: DetectedEquipment) => {
    updateEquipment({ mainCamera: camera });
  };

  return (
    <div>
      <button onClick={() => handleMountSelection(someMount)}>
        Sélectionner monture
      </button>
      <button onClick={() => handleCameraSelection(someCamera)}>
        Sélectionner caméra
      </button>
    </div>
  );
}
```

### Synchronisation avec le serveur

```typescript
import { useEquipmentSync } from "../hooks/useEquipmentSync";

function MyComponent() {
  const { saveEquipmentState, loadEquipmentState, clearEquipmentState } =
    useEquipmentSync();

  // La synchronisation est automatique, mais vous pouvez forcer des actions
  const handleSave = async () => {
    await saveEquipmentState();
  };

  const handleLoad = async () => {
    await loadEquipmentState();
  };

  const handleClear = async () => {
    await clearEquipmentState();
  };

  return (
    <div>
      <button onClick={handleSave}>Sauvegarder</button>
      <button onClick={handleLoad}>Charger</button>
      <button onClick={handleClear}>Effacer</button>
    </div>
  );
}
```

### Vérifier l'état de préparation

```typescript
import { useEquipmentReadiness } from "../hooks/useEquipmentSync";

function ReadinessIndicator() {
  const {
    hasEssentialEquipment,
    hasFullSetup,
    hasGuidingSetup,
    readinessScore,
  } = useEquipmentReadiness();

  return (
    <div>
      <div>Équipement essentiel: {hasEssentialEquipment ? "✅" : "❌"}</div>
      <div>Configuration complète: {hasFullSetup ? "✅" : "❌"}</div>
      <div>Configuration de guidage: {hasGuidingSetup ? "✅" : "❌"}</div>
      <div>Score de préparation: {readinessScore}/5</div>
    </div>
  );
}
```

## API Routes

### GET /api/equipment/context

Récupère le contexte d'équipement sauvegardé sur le serveur.

**Réponse :**

```json
{
  "context": {
    "selectedMount": "mount-123",
    "selectedMainCamera": "camera-456",
    "selectedGuideCamera": "guide-789",
    "selectedFocuser": "focuser-101",
    "selectedFilterWheel": "filter-202",
    "mainFocalLength": 1000,
    "guideFocalLength": 240,
    "lastUpdated": "2024-01-01T12:00:00Z"
  },
  "summary": {
    "hasMount": true,
    "hasMainCamera": true,
    "hasGuideCamera": true,
    "hasFocuser": true,
    "hasFilterWheel": true,
    "lastUpdated": "2024-01-01T12:00:00Z"
  },
  "hasContext": true,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### POST /api/equipment/context

Sauvegarde le contexte d'équipement sur le serveur.

**Requête :**

```json
{
  "selectedMount": "mount-123",
  "selectedMainCamera": "camera-456",
  "selectedGuideCamera": "guide-789",
  "selectedFocuser": "focuser-101",
  "selectedFilterWheel": "filter-202",
  "mainFocalLength": 1000,
  "guideFocalLength": 240
}
```

### DELETE /api/equipment/context

Efface le contexte d'équipement sauvegardé sur le serveur.

## Flux de données

1. **Initialisation** : Au démarrage de l'application, le contexte est chargé depuis le serveur
2. **Modification** : Quand l'utilisateur sélectionne un équipement, le contexte local est mis à jour
3. **Synchronisation** : Après un délai (1 seconde), le contexte est sauvegardé sur le serveur
4. **Persistance** : Le serveur sauvegarde le contexte dans un fichier JSON pour la persistance
5. **Récupération** : Au rechargement de la page, le contexte est restauré depuis le serveur

## Avantages

- **Persistance** : La configuration survit aux rechargements de page et aux déconnexions
- **Synchronisation** : Le serveur connaît toujours la configuration actuelle
- **Résilience** : En cas de perte de connexion, le contexte local reste utilisable
- **Simplicité** : API simple pour accéder et modifier le contexte
- **Performance** : Synchronisation avec debouncing pour éviter les requêtes excessives

## Limitations

- **Conflit de concurrence** : Pas de gestion des conflits si plusieurs clients modifient le contexte
- **Stockage unique** : Un seul contexte par serveur (pas de sessions multiples)
- **Dépendance réseau** : La synchronisation nécessite une connexion au serveur
