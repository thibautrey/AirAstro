# Sélecteur de Localisation AirAstro

Le sélecteur de localisation permet aux utilisateurs de définir leur position géographique pour l'astrophotographie. Il fonctionne entièrement hors ligne et offre deux méthodes de saisie.

## Fonctionnalités

### 🌍 Deux méthodes de localisation

1. **GPS automatique** - Utilise la géolocalisation du navigateur
2. **Saisie manuelle** - Permet de saisir latitude et longitude manuellement

### 💾 Persistance des données

- Les coordonnées sont sauvegardées dans `localStorage`
- Chargement automatique au redémarrage de l'application
- Horodatage pour connaître la fraîcheur des données

### 🎨 Design system intégré

- Respecte la palette de couleurs d'astronomie
- Interface adaptée au mode sombre
- Animations fluides et design responsive

## Utilisation

### Hook useLocation

```tsx
import { useLocation } from "../hooks/useLocation";

function MyComponent() {
  const { location, isLoading, updateLocation, getLocationName } =
    useLocation();

  return (
    <div>{location ? getLocationName(location) : "Aucune localisation"}</div>
  );
}
```

### Composant LocationSelector

```tsx
import LocationSelector from "./LocationSelector";

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);
  const { location, updateLocation } = useLocation();

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Choisir localisation</button>

      <LocationSelector
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onLocationSelected={updateLocation}
        currentLocation={location}
      />
    </>
  );
}
```

### Composant LocationDisplay

```tsx
import LocationDisplay from "./LocationDisplay";

function MyComponent() {
  const { location } = useLocation();

  return (
    <LocationDisplay location={location} compact={true} showAccuracy={true} />
  );
}
```

## API Reference

### LocationData

```typescript
interface LocationData {
  latitude: number; // Latitude en degrés (-90 à 90)
  longitude: number; // Longitude en degrés (-180 à 180)
  accuracy?: number; // Précision en mètres (GPS uniquement)
  method: "gps" | "manual"; // Méthode d'acquisition
  timestamp?: number; // Horodatage de la dernière mise à jour
}
```

### useLocation Hook

| Propriété           | Type                                     | Description                |
| ------------------- | ---------------------------------------- | -------------------------- |
| `location`          | `LocationData \| null`                   | Position actuelle          |
| `isLoading`         | `boolean`                                | État de chargement initial |
| `updateLocation`    | `(loc: LocationData) => void`            | Met à jour la position     |
| `clearLocation`     | `() => void`                             | Efface la position         |
| `getLocationName`   | `(loc: LocationData \| null) => string`  | Nom de ville formaté       |
| `formatLocation`    | `(loc: LocationData \| null) => string`  | Coordonnées formatées      |
| `isLocationCurrent` | `(loc: LocationData \| null) => boolean` | Position récente (<24h)    |

### LocationSelector Props

| Prop                 | Type                          | Required | Description                  |
| -------------------- | ----------------------------- | -------- | ---------------------------- |
| `isOpen`             | `boolean`                     | ✅       | État d'ouverture de la modal |
| `onClose`            | `() => void`                  | ✅       | Callback de fermeture        |
| `onLocationSelected` | `(loc: LocationData) => void` | ✅       | Callback de sélection        |
| `currentLocation`    | `LocationData \| undefined`   | ❌       | Position actuelle            |

### LocationDisplay Props

| Prop           | Type                   | Default | Description                |
| -------------- | ---------------------- | ------- | -------------------------- |
| `location`     | `LocationData \| null` | -       | Position à afficher        |
| `compact`      | `boolean`              | `false` | Mode compact               |
| `showAccuracy` | `boolean`              | `false` | Afficher la précision      |
| `className`    | `string`               | `""`    | Classes CSS additionnelles |

## Gestion des erreurs

Le composant gère automatiquement les erreurs courantes :

- **Permission refusée** - Invite l'utilisateur à autoriser la géolocalisation
- **Position indisponible** - Signal GPS faible ou absent
- **Délai dépassé** - Timeout de géolocalisation (10 secondes)
- **Coordonnées invalides** - Validation des plages de latitude/longitude

## Sécurité et confidentialité

- **Données locales uniquement** - Aucune transmission vers des serveurs
- **Permission explicite** - L'utilisateur doit autoriser la géolocalisation
- **Fonctionnement hors ligne** - Pas de dépendance internet
- **Cache intelligent** - Position GPS valide pendant 1 minute

## Cas d'usage d'astronomie

### Calculs astronomiques

La position est utilisée pour :

- Calcul des heures de lever/coucher du soleil
- Position des objets célestes (RA/DEC vers Alt/Az)
- Calibration des montures équatoriales
- Prédictions de passages satellites

### Exemple d'intégration

```tsx
function TelescopeSetup() {
  const { location } = useLocation();

  // Calcul de l'angle de latitude pour la monture équatoriale
  const mountLatitude = location?.latitude ?? 0;

  return (
    <div>
      <h3>Configuration monture</h3>
      <p>Latitude du site : {mountLatitude.toFixed(4)}°</p>
      <p>Angle de montage requis : {Math.abs(mountLatitude).toFixed(1)}°</p>
    </div>
  );
}
```

## Performance

- **Chargement initial** : ~50ms (lecture localStorage)
- **Géolocalisation** : 2-10 secondes selon signal GPS
- **Taille bundle** : ~3KB (composants + hook)
- **Mémoire** : ~1KB pour les données de position

## Compatibilité

- ✅ **Desktop** : Chrome, Firefox, Safari, Edge
- ✅ **Mobile** : iOS Safari, Chrome Mobile, Samsung Internet
- ✅ **PWA** : Support complet en mode standalone
- ❌ **HTTP** : Géolocalisation nécessite HTTPS (sauf localhost)
