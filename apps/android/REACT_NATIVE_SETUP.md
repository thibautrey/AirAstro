# AirAstro Android Application

## Recommandation : React Native

Pour maintenir une cohérence maximale avec l'application iOS et implémenter efficacement le système de design d'astronomie, nous recommandons fortement l'utilisation de **React Native** pour l'application Android.

## Avantages de React Native pour AirAstro

### 1. Cohérence Cross-Platform

- **Design uniforme** : Même apparence et comportement sur iOS et Android
- **Palette de couleurs identique** : Respect strict des couleurs d'astronomie
- **Composants partagés** : Réutilisation du code UI entre plateformes

### 2. Optimisation pour l'Astronomie

- **Mode sombre natif** : Parfait pour préserver la vision nocturne
- **Performance** : Excellente pour les applications temps réel
- **Personnalisation** : Contrôle total sur l'apparence et les interactions

### 3. Développement Efficace

- **Code partagé** : 70-80% du code réutilisable entre iOS et Android
- **Maintenance simplifiée** : Un seul design système à maintenir
- **Équipe unifiée** : Développeurs peuvent travailler sur les deux plateformes

## Configuration Recommandée

### Structure de Projet

```
apps/
  react-native/           # Application React Native principale
    src/
      components/         # Composants UI réutilisables
        AstronomyButton.tsx
        AstronomyCard.tsx
        AstronomyInput.tsx
      theme/             # Système de design
        colors.ts
        typography.ts
        spacing.ts
      screens/           # Écrans de l'application
        WelcomeScreen.tsx
        DeviceListScreen.tsx
    android/             # Configuration Android spécifique
    ios/                 # Configuration iOS spécifique
```

### Installation et Setup

#### Prérequis

```bash
# Node.js et npm
npm install -g react-native-cli

# Pour Android
# Android Studio avec SDK 31+
# Java Development Kit 11

# Pour iOS (si développement Mac)
# Xcode 14+
# CocoaPods
```

#### Initialisation du Projet

```bash
cd apps/
npx react-native init AirAstroRN --template react-native-template-typescript
cd AirAstroRN
```

#### Dépendances Recommandées

```bash
# Navigation
npm install @react-navigation/native @react-navigation/stack
npm install react-native-screens react-native-safe-area-context

# Design System
npm install react-native-vector-icons
npm install react-native-paper  # Optionnel pour des composants de base

# État et données
npm install @reduxjs/toolkit react-redux
npm install react-native-async-storage

# Réseau
npm install @react-native-async-storage/async-storage
npm install react-native-network-info
```

## Implémentation du Design System

### Couleurs (theme/colors.ts)

```typescript
export const AstronomyColors = {
  // Backgrounds
  background: "#000000",
  backgroundSecondary: "#1A1A1A",
  backgroundTertiary: "#2D2D2D",

  // Text
  textPrimary: "#FFFFFF",
  textSecondary: "#B0B0B0",
  textRed: "#FF4444",

  // Actions
  green: "#00AA00",
  blue: "#0080FF",
  red: "#FF4444",

  // Status
  success: "#00DD00",
  warning: "#FFAA00",
  error: "#FF4444",
  info: "#00AAFF",

  // Utility
  disabled: "#666666",
};
```

### Typographie (theme/typography.ts)

```typescript
export const AstronomyTypography = {
  largeTitle: {
    fontSize: 32,
    fontWeight: "bold" as const,
    color: AstronomyColors.textPrimary,
  },
  title: {
    fontSize: 24,
    fontWeight: "600" as const,
    color: AstronomyColors.textPrimary,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "500" as const,
    color: AstronomyColors.textPrimary,
  },
  body: {
    fontSize: 16,
    fontWeight: "normal" as const,
    color: AstronomyColors.textPrimary,
  },
  caption: {
    fontSize: 12,
    fontWeight: "normal" as const,
    color: AstronomyColors.textSecondary,
  },
};
```

### Composants de Base

#### AstronomyButton.tsx

```typescript
import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { AstronomyColors, AstronomySpacing } from "../theme";

interface Props {
  title: string;
  onPress: () => void;
  type?: "primary" | "secondary" | "danger";
  disabled?: boolean;
}

export const AstronomyButton: React.FC<Props> = ({
  title,
  onPress,
  type = "primary",
  disabled = false,
}) => {
  const buttonColor = disabled
    ? AstronomyColors.disabled
    : type === "primary"
    ? AstronomyColors.green
    : type === "secondary"
    ? AstronomyColors.blue
    : AstronomyColors.red;

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: buttonColor }]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: AstronomySpacing.m,
    paddingVertical: AstronomySpacing.s,
    borderRadius: 8,
    alignItems: "center",
    shadowColor: AstronomyColors.green,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  buttonText: {
    color: AstronomyColors.textPrimary,
    fontSize: 16,
    fontWeight: "500",
  },
});
```

## Migration depuis l'iOS SwiftUI

### Étapes de Migration

1. **Analyser les vues SwiftUI existantes**
2. **Créer les équivalents React Native**
3. **Adapter la logique métier**
4. **Tester sur les deux plateformes**

### Correspondances SwiftUI → React Native

- `VStack` → `View` avec `flexDirection: 'column'`
- `HStack` → `View` avec `flexDirection: 'row'`
- `Text` → `Text`
- `Button` → `TouchableOpacity` + `Text`
- `NavigationView` → `@react-navigation/stack`

## Tests et Validation

### Tests Visuels

- **Simulator iOS** : Test de cohérence avec l'app SwiftUI
- **Emulator Android** : Validation du design sur Android
- **Appareils physiques** : Test en conditions réelles (nuit)

### Tests Fonctionnels

- **Navigation** : Fluidité entre écrans
- **Réseau** : Détection des appareils AirAstro
- **Performance** : Responsive en mode astronomie

## Déploiement

### Build Android

```bash
cd android
./gradlew assembleRelease
```

### Build iOS (si applicable)

```bash
cd ios
xcodebuild -workspace AirAstroRN.xcworkspace -scheme AirAstroRN archive
```

## Maintenance

### Synchronisation avec iOS

- **Design System** : Maintenir la cohérence des couleurs et espacements
- **Nouvelles fonctionnalités** : Implémenter en parallèle sur React Native
- **Tests** : Valider l'équivalence fonctionnelle

### Optimisations

- **Bundle size** : Minimiser la taille de l'application
- **Performance** : Optimiser pour les anciens appareils Android
- **Batterie** : Réduire la consommation en mode observation

## Support et Communauté

### Ressources

- [React Native Documentation](https://reactnative.dev/)
- [React Navigation](https://reactnavigation.org/)
- [React Native Paper](https://callstack.github.io/react-native-paper/)

### Contribution

Voir [CONTRIBUTING.md](../../CONTRIBUTING.md) pour les guidelines de contribution spécifiques au design system d'astronomie.
