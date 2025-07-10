# AirAstro React Native Setup Guide

## Overview

Cette guide explique comment configer React Native pour maintenir une cohérence avec le design system d'astronomie d'AirAstro.

## Installation via CLI moderne

Utilisez la nouvelle CLI React Native Community :

```bash
# Installation globale de la nouvelle CLI
npm install -g @react-native-community/cli

# Création du projet avec TypeScript
npx @react-native-community/cli init AirAstroRN --template react-native-template-typescript

# Installation des dépendances du design system
cd AirAstroRN
npm install react-native-vector-icons
npm install @react-navigation/native @react-navigation/stack
npm install react-native-screens react-native-safe-area-context
```

## Configuration du Design System

### 1. Créer le fichier theme/colors.ts

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

export const AstronomySpacing = {
  xxs: 4,
  xs: 8,
  s: 16,
  m: 24,
  l: 32,
  xl: 48,
  xxl: 64,
};
```

### 2. Créer les composants de base

#### components/AstronomyButton.tsx

```typescript
import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { AstronomyColors, AstronomySpacing } from "../theme/colors";

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
  const getButtonColor = () => {
    if (disabled) return AstronomyColors.disabled;
    switch (type) {
      case "primary":
        return AstronomyColors.green;
      case "secondary":
        return AstronomyColors.blue;
      case "danger":
        return AstronomyColors.red;
      default:
        return AstronomyColors.green;
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: getButtonColor() }]}
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

### 3. Configuration des écrans

#### screens/WelcomeScreen.tsx

```typescript
import React from "react";
import { View, Text, StyleSheet, SafeAreaView } from "react-native";
import { AstronomyColors, AstronomySpacing } from "../theme/colors";
import { AstronomyButton } from "../components/AstronomyButton";

export const WelcomeScreen: React.FC = () => {
  const handleConnect = () => {
    // Navigation logic here
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Connexion à AirAstro</Text>
        <Text style={styles.subtitle}>
          Contrôlez votre équipement d'astrophotographie
        </Text>
      </View>

      <View style={styles.content}>
        {/* Device list would go here */}
        <Text style={styles.infoText}>Recherche des appareils AirAstro...</Text>
      </View>

      <View style={styles.footer}>
        <AstronomyButton
          title="Se connecter"
          onPress={handleConnect}
          type="primary"
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AstronomyColors.background,
  },
  header: {
    padding: AstronomySpacing.m,
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: AstronomyColors.textPrimary,
    marginBottom: AstronomySpacing.s,
  },
  subtitle: {
    fontSize: 18,
    color: AstronomyColors.textSecondary,
    textAlign: "center",
  },
  content: {
    flex: 1,
    padding: AstronomySpacing.m,
    justifyContent: "center",
    alignItems: "center",
  },
  infoText: {
    fontSize: 16,
    color: AstronomyColors.textSecondary,
    textAlign: "center",
  },
  footer: {
    padding: AstronomySpacing.m,
  },
});
```

### 4. Configuration de l'App principale

#### App.tsx

```typescript
import React from "react";
import { StatusBar } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { WelcomeScreen } from "./src/screens/WelcomeScreen";
import { AstronomyColors } from "./src/theme/colors";

const Stack = createStackNavigator();

const App: React.FC = () => {
  return (
    <>
      <StatusBar
        barStyle="light-content"
        backgroundColor={AstronomyColors.background}
      />
      <NavigationContainer
        theme={{
          dark: true,
          colors: {
            primary: AstronomyColors.blue,
            background: AstronomyColors.background,
            card: AstronomyColors.backgroundSecondary,
            text: AstronomyColors.textPrimary,
            border: AstronomyColors.backgroundTertiary,
            notification: AstronomyColors.error,
          },
        }}
      >
        <Stack.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: AstronomyColors.backgroundSecondary,
            },
            headerTintColor: AstronomyColors.textPrimary,
            headerTitleStyle: {
              color: AstronomyColors.textPrimary,
            },
          }}
        >
          <Stack.Screen
            name="Welcome"
            component={WelcomeScreen}
            options={{ title: "AirAstro" }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
};

export default App;
```

## Configuration avancée

### Metro Config (metro.config.js)

```javascript
const { getDefaultConfig } = require("metro-config");

module.exports = (async () => {
  const {
    resolver: { sourceExts, assetExts },
  } = await getDefaultConfig();
  return {
    transformer: {
      babelTransformerPath: require.resolve("react-native-svg-transformer"),
    },
    resolver: {
      assetExts: assetExts.filter((ext) => ext !== "svg"),
      sourceExts: [...sourceExts, "svg"],
    },
  };
})();
```

### Package.json Scripts

```json
{
  "scripts": {
    "android": "react-native run-android",
    "ios": "react-native run-ios",
    "start": "react-native start",
    "test": "jest",
    "lint": "eslint . --ext .js,.jsx,.ts,.tsx"
  }
}
```

## Tests et Validation

### Tests unitaires (Jest)

```typescript
// __tests__/AstronomyButton.test.tsx
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { AstronomyButton } from "../src/components/AstronomyButton";

describe("AstronomyButton", () => {
  it("renders correctly", () => {
    const { getByText } = render(
      <AstronomyButton title="Test Button" onPress={() => {}} />
    );
    expect(getByText("Test Button")).toBeTruthy();
  });

  it("calls onPress when pressed", () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <AstronomyButton title="Test Button" onPress={mockOnPress} />
    );

    fireEvent.press(getByText("Test Button"));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });
});
```

## Déployement

### Build Android

```bash
cd android
./gradlew assembleRelease
```

### Build iOS

```bash
cd ios
xcodebuild -workspace AirAstroRN.xcworkspace -scheme AirAstroRN archive
```

## Synchronisation avec iOS

Pour maintenir la cohérence avec l'application iOS SwiftUI :

1. **Couleurs** : Utiliser exactement les mêmes codes couleur hex
2. **Espacements** : Respecter le système de grille 8pt
3. **Typographie** : Adapter les tailles de police iOS vers React Native
4. **Animations** : Reproduire les mêmes durées et courbes d'animation

## Ressources

- [React Native Documentation](https://reactnative.dev/)
- [React Navigation](https://reactnavigation.org/)
- [Testing Library for React Native](https://callstack.github.io/react-native-testing-library/)
