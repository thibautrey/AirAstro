# Gestion des Dimensions de Viewport sur Mobile Safari

## Problème Résolu

Notre application rencontrait des problèmes de dimensions de viewport sur Mobile Safari, particulièrement :

1. Hauteur de viewport lors du passage entre le mode Safari classique et le mode standalone (PWA)
2. **Largeur de viewport en mode paysage sur iPhone** où 5-10% de l'UI n'était pas visible à droite

## Solution Implémentée

### 1. Modification de la Meta Viewport

**Avant :**

```html
<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
/>
```

**Après :**

```html
<meta
  name="viewport"
  content="user-scalable=no, width=device-width, height=device-height, initial-scale=1.0, maximum-scale=1.0, viewport-fit=cover"
/>
```

**Changements :**

- Ajout de `height=device-height`
- Réorganisation de l'ordre des propriétés pour placer `user-scalable=no` en premier

### 2. Hook personnalisé `useViewportHeight` (maintenant `useViewportDimensions`)

Le hook détecte automatiquement :

- Si l'application fonctionne en mode standalone (PWA) ou dans Safari
- La hauteur ET largeur réelle du viewport via `window.innerHeight/innerWidth`
- Les changements d'orientation et de taille de fenêtre
- Les changements du Visual Viewport API (clavier virtuel, etc.)

**Fonctionnalités :**

```typescript
const {
  viewportHeight,
  viewportWidth,
  isStandalone,
  getHeightStyle,
  getWidthStyle,
  getAdjustedHeightStyle,
  getDimensionsStyle,
} = useViewportHeight();
```

### 3. Variables CSS Dynamiques

Le hook met à jour automatiquement ces variables CSS :

- `--viewport-height` : Hauteur réelle du viewport
- `--viewport-width` : **Largeur réelle du viewport**
- `--adjusted-viewport-height` : Hauteur ajustée (−32px pour Safari mobile)
- `--visual-viewport-height` : Hauteur du Visual Viewport
- `--visual-viewport-width` : **Largeur du Visual Viewport**

### 4. Gestion des Safe Areas pour iPhone en mode paysage

**Nouveaux styles appliqués :**

```css
/* Pour #root en mode safe area */
width: calc(100vw - env(safe-area-inset-left) - env(safe-area-inset-right));
margin-left: calc(-1 * env(safe-area-inset-left));
margin-right: calc(-1 * env(safe-area-inset-right));
```

### 5. Classes Utilitaires Tailwind

**Nouvelles classes disponibles :**

```css
/* Hauteurs */
.h-viewport                /* height: var(--viewport-height) */
/* height: var(--viewport-height) */
.h-viewport-adjusted       /* height: var(--adjusted-viewport-height) */
.h-visual-viewport         /* height: var(--visual-viewport-height) */
.min-h-viewport           /* min-height: var(--viewport-height) */
.min-h-viewport-adjusted   /* min-height: var(--adjusted-viewport-height) */

/* Largeurs - NOUVELLES */
.w-viewport               /* width: var(--viewport-width) */
.w-visual-viewport        /* width: var(--visual-viewport-width) */
.max-w-viewport          /* max-width: var(--viewport-width) */

/* Safe Areas - NOUVELLES */
.safe-area-inset-left     /* margin-left: calc(-1 * env(safe-area-inset-left)) */
.safe-area-inset-right    /* margin-right: calc(-1 * env(safe-area-inset-right)) */
.safe-area-inset-horizontal; /* marges négatives gauche + droite */
```

## Utilisation

### Dans App.tsx

```typescript
import { useViewportHeight } from "./hooks/useViewportHeight";

export default function App() {
  // Initialiser au niveau de l'app
  useViewportHeight();

  // ...rest of component
}
```

### Dans les composants

**Remplacer les anciennes classes :**

```typescript
// Avant
<div className="min-h-screen">

// Après - Hauteur
<div className="h-viewport">

// Après - Largeur (pour le problème iPhone paysage)
<div className="w-viewport">

// Après - Dimensions complètes
<div className="h-viewport w-viewport">
```

### Cas d'usage spécifiques iPhone paysage

```typescript
// Pour un conteneur principal qui doit occuper tout l'écran
<div className="h-viewport w-viewport">

// Pour un élément qui doit s'adapter aux safe areas
<div className="safe-area-inset-horizontal">

// Pour un contenu centré qui respecte les safe areas
<div className="w-viewport max-w-viewport mx-auto">
```

### Classes existantes mises à jour

- `.viewport-height` : Utilise maintenant `var(--viewport-height)` ET `var(--viewport-width)`
- `.dashboard-content-height` : Utilise `var(--adjusted-viewport-height) - 44px`

## Avantages de cette Solution

1. **Détection automatique** du mode Safari vs Standalone
2. **Hauteur précise** basée sur `window.innerHeight` comme recommandé
3. **Réactivité** aux changements d'orientation et de clavier virtuel
4. **Compatibilité** avec tous les navigateurs mobiles
5. **API simple** avec des utilitaires Tailwind
6. **Performance** optimisée avec mise en cache des valeurs

## Référence Forum

Cette solution est basée sur les recommandations trouvées dans les forums de développement web :

> "Use `<meta name="viewport" content="user-scalable=no, width=device-width, height=device-height" />` and then the correct value can be get from `window.innerWidth` / `window.innerHeight`"

> "You can determine whether user is in Mobile Safari or in desktop bookmark with `navigator.standalone` property. With this you could decide whether to substract 32px or not."

## Migration

Pour migrer un composant existant :

1. Remplacer `min-h-screen` par `h-viewport`
2. Remplacer les calculs manuels de hauteur par les nouvelles variables CSS
3. S'assurer que `useViewportHeight()` est appelé dans `App.tsx`
