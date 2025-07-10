# Filtrage des Équipements Inconnus - AirAstro

## Vue d'ensemble

Pour améliorer la qualité de l'interface utilisateur, le système de détection d'équipements AirAstro filtre maintenant automatiquement les équipements complètement inconnus qui polluent l'interface. Ces appareils sont généralement des contrôleurs, des hubs USB, ou des adaptateurs sans intérêt pour l'astronomie.

## Critères de Filtrage

### Équipements Filtrés

Les équipements suivants sont automatiquement filtrés de la liste par défaut :

1. **Équipements de type "unknown" avec confiance < 50** :
   - Appareils USB non identifiés
   - Contrôleurs génériques
   - Hubs USB et adaptateurs

2. **Équipements série avec confiance très faible** :
   - Ports série génériques
   - Adaptateurs USB-Série

3. **Équipements avec mots-clés spécifiques** :
   - "hub", "controller", "bridge", "adapter"
   - "wireless", "bluetooth", "usb-serial", "cp210"

### Équipements Conservés

Les équipements suivants sont **toujours** affichés :

1. **Équipements avec confiance élevée (≥ 50)** :
   - Équipements reconnus dans la base de données
   - Équipements avec drivers INDI disponibles

2. **Équipements avec type identifié** :
   - Caméras (camera, guide-camera)
   - Montures (mount)
   - Focuseurs (focuser)
   - Roues à filtres (filter-wheel)
   - Accessoires (dome, weather, aux)

## Utilisation

### Configuration par Défaut

Par défaut, l'interface affiche seulement les équipements pertinents :

```typescript
import { useEquipment } from "../hooks/useEquipment";

function EquipmentSetup() {
  const { equipment, summary, loading, error } = useEquipment({
    enablePolling: true,
    pollingInterval: 30000,
  });

  // Seuls les équipements avec confiance élevée sont affichés
  return (
    <div>
      {equipment.map((device) => (
        <EquipmentCard key={device.id} device={device} />
      ))}
    </div>
  );
}
```

### Affichage de Tous les Équipements

Pour afficher tous les équipements, y compris les inconnus :

```typescript
import { useEquipment } from "../hooks/useEquipment";

function EquipmentSetup() {
  const { equipment, summary, loading, error } = useEquipment({
    enablePolling: true,
    pollingInterval: 30000,
    includeUnknown: true, // Afficher tous les équipements
  });

  return (
    <div>
      {equipment.map((device) => (
        <EquipmentCard key={device.id} device={device} />
      ))}
    </div>
  );
}
```

### API REST

#### Filtrage par Défaut

```bash
# Récupérer seulement les équipements pertinents
curl http://airastro.local:3000/api/equipment
```

#### Inclure les Équipements Inconnus

```bash
# Récupérer tous les équipements
curl http://airastro.local:3000/api/equipment?includeUnknown=true
```

## Scores de Confiance

Le système utilise un score de confiance (0-100) pour évaluer la pertinence des équipements :

| Score | Signification | Affiché par défaut |
|-------|---------------|-------------------|
| 95-100 | Équipement parfaitement identifié | ✅ Oui |
| 60-94 | Équipement reconnu par type | ✅ Oui |
| 50-59 | Équipement probablement utile | ✅ Oui |
| 20-49 | Équipement générique | ❌ Non |
| 5-19 | Équipement probablement inutile | ❌ Non |
| 0-4 | Équipement clairement inutile | ❌ Non |

## Exemples d'Équipements Filtrés

### Équipements USB Filtrés

```json
{
  "id": "usb-1a86:7523",
  "name": "QinHeng Electronics HL-340 USB-Serial adapter",
  "type": "unknown",
  "manufacturer": "Unknown",
  "confidence": 5,
  "autoInstallable": false
}
```

### Équipements Série Filtrés

```json
{
  "id": "serial-dev-ttyUSB0",
  "name": "Serial Device (/dev/ttyUSB0)",
  "type": "unknown",
  "manufacturer": "Unknown",
  "confidence": 10,
  "autoInstallable": false
}
```

## Exemples d'Équipements Conservés

### Équipement Reconnu

```json
{
  "id": "usb-03c3:120a",
  "name": "ASI120MC",
  "type": "camera",
  "manufacturer": "ZWO",
  "confidence": 95,
  "autoInstallable": true
}
```

### Équipement Partiellement Identifié

```json
{
  "id": "usb-1234:5678",
  "name": "Astronomy Camera Pro",
  "type": "camera",
  "manufacturer": "Unknown",
  "confidence": 60,
  "autoInstallable": false
}
```

## Dépannage

### Équipement Important Manquant

Si un équipement important est filtré par erreur :

1. **Vérifier avec `includeUnknown: true`** :
   ```typescript
   const { equipment } = useEquipment({ includeUnknown: true });
   ```

2. **Vérifier le score de confiance** :
   L'équipement devrait avoir un score ≥ 50 pour être affiché

3. **Améliorer la détection** :
   Ajouter l'équipement à la base de données ou améliorer la détection par mots-clés

### Améliorer la Détection

Pour améliorer la détection d'un équipement, modifiez `createUnknownDevice()` dans `equipment-detector.service.ts` :

```typescript
// Ajouter des mots-clés pour améliorer la détection
if (desc.includes("mon-equipement") || desc.includes("mon-modele")) {
  type = "camera"; // ou autre type approprié
  confidence = 60;
}
```

## Bénéfices

1. **Interface Plus Propre** : Moins d'encombrement visuel
2. **Meilleure Expérience Utilisateur** : Focus sur les équipements pertinents
3. **Performance Améliorée** : Moins d'équipements à traiter
4. **Flexibilité** : Option pour afficher tous les équipements si nécessaire

## Compatibilité

- ✅ **Rétrocompatible** : Le comportement par défaut est amélioré
- ✅ **Configurable** : Option pour désactiver le filtrage
- ✅ **API REST** : Support du paramètre `includeUnknown`
- ✅ **Frontend** : Hook `useEquipment` mis à jour
