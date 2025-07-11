# Contexte Global d'Équipement - Documentation

## Vue d'ensemble

Le contexte global d'équipement (`EquipmentContext`) permet de gérer l'état des équipements sélectionnés à travers toute l'application AirAstro. Ce système remplace la gestion locale d'état et offre une approche centralisée pour la configuration des équipements.

## Architecture

### EquipmentProvider

Le provider encapsule toute l'application et fournit l'état global des équipements :

```tsx
// Dans App.tsx
import { EquipmentProvider } from "./contexts/EquipmentContext";

export default function App() {
  return (
    <EquipmentProvider>
      <Router>{/* Vos routes */}</Router>
    </EquipmentProvider>
  );
}
```

### Types d'équipement supportés

```typescript
interface SelectedEquipmentConfig {
  mount?: DetectedEquipment; // Monture
  mainCamera?: DetectedEquipment; // Caméra principale
  mainFocalLength: number; // Focale du télescope principal
  guideCamera?: DetectedEquipment; // Caméra de guidage
  guideFocalLength: number; // Focale du télescope de guidage
  focuser?: DetectedEquipment; // Focuser
  filterWheel?: DetectedEquipment; // Roue à filtres
}
```

## Utilisation dans les composants

### Hook principal : useEquipmentContext

```tsx
import { useEquipmentContext } from "../contexts/EquipmentContext";

function MonComposant() {
  const {
    selectedEquipment,
    updateEquipment,
    clearEquipment,
    hasEquipmentOfType,
  } = useEquipmentContext();

  // Vérifier si une monture est sélectionnée
  const hasMount = hasEquipmentOfType("mount");

  // Obtenir la caméra principale
  const mainCamera = selectedEquipment.mainCamera;

  // Mettre à jour un équipement
  const handleSelectMount = (mount: DetectedEquipment) => {
    updateEquipment("mount", mount);
  };

  // Effacer un équipement
  const handleClearCamera = () => {
    clearEquipment("mainCamera");
  };

  return (
    <div>
      {hasMount && <p>Monture : {selectedEquipment.mount?.name}</p>}
      {mainCamera && (
        <p>
          Caméra : {mainCamera.manufacturer} {mainCamera.model}
        </p>
      )}
    </div>
  );
}
```

### Hooks spécialisés

#### useConnectedEquipment

```tsx
import { useConnectedEquipment } from "../contexts/EquipmentContext";

function EquipmentSummary() {
  const equipment = useConnectedEquipment();

  return (
    <div>
      <p>Monture : {equipment.mount?.name || "Non configurée"}</p>
      <p>Caméra : {equipment.mainCamera?.name || "Non configurée"}</p>
      <p>Focale : {equipment.mainFocalLength}mm</p>
    </div>
  );
}
```

#### useEquipmentStats

```tsx
import { useEquipmentStats } from "../contexts/EquipmentContext";

function EquipmentCounter() {
  const stats = useEquipmentStats();

  return (
    <div>
      <p>{stats.connectedCount} équipements connectés</p>
      <p>Monture : {stats.hasMount ? "✓" : "✗"}</p>
      <p>Caméra : {stats.hasMainCamera ? "✓" : "✗"}</p>
    </div>
  );
}
```

### Synchronisation avec l'API

Le hook `useEquipmentSync` gère automatiquement la synchronisation avec l'API :

```tsx
import { useEquipmentSync } from "../hooks/useEquipmentSync";

function Dashboard() {
  // Synchronise automatiquement les équipements avec l'API
  useEquipmentSync();

  return <div>Dashboard content</div>;
}
```

### Vérification de l'état de préparation

```tsx
import { useEquipmentReadiness } from "../hooks/useEquipmentSync";

function SessionReadiness() {
  const { hasEssentialEquipment, hasFullSetup, readinessScore } =
    useEquipmentReadiness();

  return (
    <div>
      <p>Équipement essentiel : {hasEssentialEquipment ? "✓" : "✗"}</p>
      <p>Configuration complète : {hasFullSetup ? "✓" : "✗"}</p>
      <p>Score de préparation : {readinessScore}/5</p>
    </div>
  );
}
```

## Stockage et persistance

### Stockage local

Les équipements sélectionnés sont automatiquement sauvegardés dans le localStorage du navigateur sous la clé `airastro_selected_equipment`.

### Synchronisation API

Les équipements sont également synchronisés avec l'API AirAstro via l'endpoint `/api/equipment/state` :

- **POST** : Sauvegarde l'état actuel
- **GET** : Récupère l'état depuis le serveur

## Intégration avec les composants existants

### EquipmentSetup

Le composant `EquipmentSetup` utilise maintenant le contexte global au lieu du state local :

```tsx
// Avant (state local)
const [formData, setFormData] = useState({
  mount: "",
  mainCamera: "",
  // ...
});

// Après (contexte global)
const { selectedEquipment, updateEquipment } = useEquipmentContext();
```

### CameraRail

Le composant `CameraRail` peut maintenant accéder aux caméras sélectionnées :

```tsx
function CameraRail() {
  const { selectedEquipment } = useEquipmentContext();
  const activeCamera =
    selectedEquipment.mainCamera || selectedEquipment.guideCamera;

  // Utiliser la caméra active...
}
```

## Migration des composants existants

### Étapes de migration

1. **Remplacer le state local par le contexte** :

   ```tsx
   // Avant
   const [selectedCamera, setSelectedCamera] = useState(null);

   // Après
   const { selectedEquipment, updateEquipment } = useEquipmentContext();
   ```

2. **Mettre à jour les fonctions de modification** :

   ```tsx
   // Avant
   const handleCameraSelect = (camera) => {
     setSelectedCamera(camera);
   };

   // Après
   const handleCameraSelect = (camera) => {
     updateEquipment("mainCamera", camera);
   };
   ```

3. **Adapter les conditions d'affichage** :

   ```tsx
   // Avant
   {
     selectedCamera && <CameraInfo camera={selectedCamera} />;
   }

   // Après
   {
     selectedEquipment.mainCamera && (
       <CameraInfo camera={selectedEquipment.mainCamera} />
     );
   }
   ```

## Bonnes pratiques

1. **Utiliser les hooks spécialisés** : Préférez `useConnectedEquipment()` ou `useEquipmentStats()` pour des besoins spécifiques.

2. **Éviter la mutation directe** : Utilisez toujours `updateEquipment()` pour modifier l'état.

3. **Gérer les états de chargement** : Vérifiez que les équipements sont bien chargés avant de les utiliser.

4. **Synchronisation prudente** : Le hook `useEquipmentSync` gère automatiquement la synchronisation avec l'API.

5. **Réactiver les validations** : Utilisez `useEquipmentReadiness()` pour vérifier l'état de préparation avant des actions critiques.

## Exemple complet

```tsx
import {
  useEquipmentContext,
  useEquipmentStats,
  useConnectedEquipment,
} from "../contexts/EquipmentContext";
import {
  useEquipmentSync,
  useEquipmentReadiness,
} from "../hooks/useEquipmentSync";

function EquipmentManager() {
  const { updateEquipment, clearEquipment } = useEquipmentContext();
  const connectedEquipment = useConnectedEquipment();
  const stats = useEquipmentStats();
  const { isReady, readinessScore } = useEquipmentReadiness();

  // Synchronisation automatique
  useEquipmentSync();

  return (
    <div>
      <h2>Gestionnaire d'équipements</h2>

      <div>
        <h3>Statistiques</h3>
        <p>{stats.connectedCount} équipements connectés</p>
        <p>Score de préparation : {readinessScore}/5</p>
        <p>Prêt pour session : {isReady ? "✓" : "✗"}</p>
      </div>

      <div>
        <h3>Équipements connectés</h3>
        {connectedEquipment.mount && (
          <p>Monture : {connectedEquipment.mount.name}</p>
        )}
        {connectedEquipment.mainCamera && (
          <p>Caméra : {connectedEquipment.mainCamera.name}</p>
        )}
      </div>

      <button onClick={() => clearEquipment("mainCamera")}>
        Effacer la caméra
      </button>
    </div>
  );
}
```

Cette architecture offre une gestion centralisée et cohérente des équipements à travers toute l'application, avec une synchronisation automatique et une persistance robuste.
