# Contributing to AirAstro

Thank you for your interest in contributing! This repository is divided into a
Raspberry Pi server and mobile applications for iOS and Android. Before you
start building, make sure your development environment is ready.

## Design System Compliance

**IMPORTANT**: AirAstro follows a strict design system optimized for astronomy applications. All UI contributions must comply with the astronomy-friendly design guidelines defined in `DESIGN_SYSTEM.md`.

### Key Design Requirements

- Use only the approved color palette (black backgrounds, white/red text, green/blue buttons)
- Follow the 8pt spacing grid system
- Ensure high contrast for excellent readability in dark environments
- Test your UI components in dark environments to verify usability
- Maintain consistency with existing component styling

Please review `DESIGN_SYSTEM.md` thoroughly before making any UI changes.

## Server Prerequisites

- **Node.js 20+** – the server is implemented with a lightweight Node.js
  framework.
- **INDI/ASCOM drivers** – install the appropriate drivers on your Raspberry Pi
  or Linux machine.
- **Raspberry Pi OS or similar** – the server targets a Raspberry Pi but should
  run on any Linux distribution once the dependencies are installed.

## Mobile App Prerequisites

- **iOS** – Xcode 14 or later on macOS is recommended. The iOS folder contains
  the application sources.
- **Android** – Android Studio (Hedgehog or newer) with the Android SDK.

### iOS Development Setup

For iOS development, the project already includes SwiftUI with a custom design system. When contributing:

1. Use the predefined color extensions in the shared design system
2. Follow SwiftUI best practices for dark mode compatibility
3. Test your changes on both simulator and physical devices
4. Ensure your UI works well in landscape orientation (primary mode for astronomy apps)

### Android Development Setup

For Android development, we recommend using React Native to maintain consistency across platforms:

1. Install React Native CLI: `npm install -g react-native-cli`
2. Set up Android Studio with the required SDKs
3. Follow the design system guidelines for consistent styling
4. Use the same color palette and spacing as defined in the design system

These prerequisites let you build and run the individual projects. According to
[`AGENTS.md`](AGENTS.md), there are currently no automated tests, so you do not
need to run any test commands when contributing.

We welcome pull requests that flesh out the project or improve documentation.
