# Migration de SwiftUI vers React Native

## Résumé

Cette migration remplace la vue d'accueil native SwiftUI par une implémentation React Native, permettant une meilleure cohérence cross-platform et une maintenance plus facile.

## Changements apportés

### 1. Nouveaux fichiers React Native

- **`WelcomeView.tsx`** : Vue d'accueil React Native avec design system astronomique
- **`index.js`** : Point d'entrée React Native
- **`types.ts`** : Définitions TypeScript partagées
- **`metro.config.js`** : Configuration Metro bundler
- **`tsconfig.json`** : Configuration TypeScript

### 2. Fichiers bridge iOS

- **`ReactNativeManager.swift`** : Gestionnaire de bridge React Native
- **`ReactNativeWelcomeView.swift`** : Wrapper SwiftUI pour la vue React Native
- **`AirAstro-Bridging-Header.h`** : Header bridge Objective-C/Swift
- **`bundle-react-native.sh`** : Script de build pour le bundle JS

### 3. Modifications des fichiers existants

- **`ContentView.swift`** : Modifié pour utiliser `ReactNativeWelcomeView`
- **`Podfile`** : Mis à jour pour le nom de target correct
- **`package.json`** : Ajout des dépendances React Native

## Fonctionnalités

### Design System Astronomique

Le composant React Native implémente fidèlement le design system :

- **Couleurs** : Palette astronomique noire/bleu optimisée pour la vision nocturne
- **Typographie** : Tailles et poids de police cohérents
- **Espacements** : Système de grille 8pt
- **Composants** : Cards, boutons, indicateurs de statut

### Layout Adaptatif

- **Mode horizontal** : Pour iPad et iPhone en paysage (40/60 split)
- **Mode vertical** : Pour iPhone en portrait (35/65 split)
- **Détection automatique** : Basée sur les dimensions d'écran

### Fonctionnalités de connexion

- **Scan de réseaux WiFi** : Détection des réseaux AirAstro
- **Liste d'appareils** : Affichage des appareils connectés
- **Sélection d'appareil** : Interface tactile pour choisir un télescope
- **Indicateurs de statut** : États visuels (connecté/déconnecté/en ligne)

## Instructions de développement

### 1. Mode développement

Pour travailler avec React Native en mode développement :

```bash
cd /Users/thibaut/gitRepo/AirAstro/apps/ios/AirAstro/AirAstro
npm start
```

Puis compilez l'app iOS normalement. La vue React Native se connectera automatiquement au serveur Metro.

### 2. Mode production

Pour créer un bundle de production :

```bash
./bundle-react-native.sh
```

### 3. Installation des dépendances

Après avoir modifié le `package.json` :

```bash
npm install
pod install
```

## Avantages de cette approche

1. **Cohérence cross-platform** : Même code et design sur iOS/Android
2. **Maintenance simplifiée** : Une seule base de code pour la logique UI
3. **Performance** : React Native offre d'excellentes performances
4. **Flexibilité** : Plus facile d'ajouter des fonctionnalités complexes
5. **Évolutivité** : Meilleure base pour des fonctionnalités futures

## Notes techniques

- La vue React Native est intégrée via un bridge natif
- Les appels aux APIs natives se font via des modules React Native
- Le design system est implémenté en JavaScript/TypeScript
- La navigation reste gérée par SwiftUI au niveau racine
