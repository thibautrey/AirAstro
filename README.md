# AirAstro

AirAstro is a monorepo aiming to create an open source alternative to commercial astrophotography controllers such as ASIAIR and Stellarmate. The project delivers:

- **iOS application** – a simple user interface to control astrophotography equipment with modern astronomy-optimized design.
- **Android application** – identical features and interface as the iOS app using React Native.
- **Raspberry Pi server** – Node.js service that runs INDI/ASCOM drivers and
  exposes control APIs.

The goal is to replicate the feature set while staying easy to use. The applications communicate with the server which is designed to run on a Raspberry Pi.

## 🌌 Design System

AirAstro features a specialized design system optimized for astronomy applications:

- **Night Vision Preservation**: Black backgrounds with red alerts to maintain dark adaptation
- **High Contrast**: White text on dark backgrounds for excellent readability
- **Consistent Colors**: Green for actions, blue for navigation, red for alerts
- **Modern UI**: Clean interface with subtle shadows and smooth animations

See [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) for complete guidelines.

## Repository Structure

```
apps/          - Mobile applications
  ios/         - iOS specific code (SwiftUI with astronomy design system)
  android/     - Android specific code (React Native recommended)
server/        - Node.js implementation of the Raspberry Pi server
```

## Technology Stack

### iOS Application

- **React Native** for cross-platform consistency
- **Dark mode optimized** for night vision preservation
- **Modern UI components** following astronomy color palette
- **Landscape-first design** for telescope mounting

### Android Application (Recommended)

- **React Native** for cross-platform consistency
- **Shared design system** with iOS for uniform experience
- **TypeScript** for type safety and better development experience
- **Navigation optimized** for astronomy workflows

### Server

- **Node.js** with lightweight framework
- **INDI/ASCOM drivers** for hardware compatibility
- **RESTful APIs** for mobile app communication
- **Raspberry Pi optimized** for field deployment

## Using Open Source Drivers

AirAstro relies on the INDI and ASCOM projects to provide hardware support. This avoids the need to implement device drivers from scratch.

## Getting Started

### Prerequisites

- **iOS Development**: Xcode 14+ on macOS
- **Android Development**: Node.js 18+, Android Studio, React Native CLI
- **Server Development**: Node.js 20+, Raspberry Pi OS

### Quick Start

1. **Clone the repository**

   ```bash
   git clone https://github.com/airastro/airastro.git
   cd airastro
   ```

2. **iOS Development**

   ```bash
   cd apps/ios/AirAstro/AirAstro
   open AirAstro.xcodeproj
   ```

3. **Android Development (React Native)**

   ```bash
   cd apps/android
   npm install
   npx @react-native-community/cli init AirAstroRN --template react-native-template-typescript
   ```

4. **Server Development**
   ```bash
   cd server
   npm install
   npm start
   ```

## Status

- ✅ **Design System**: Complete astronomy-optimized color palette and components
- 🚧 **iOS App**: Basic SwiftUI implementation with modern design
- 🚧 **Android App**: React Native setup guide and configuration ready
- 📋 **Server**: Placeholder for future development
- 📋 **Hardware Integration**: INDI/ASCOM drivers to be implemented

## Design Principles

1. **Astronomy First**: Every design decision considers night vision preservation
2. **Cross-Platform Consistency**: iOS and Android apps share identical UX
3. **Modern & Clean**: Contemporary UI with astronomy-specific adaptations
4. **Field-Ready**: Optimized for outdoor use with telescopes

## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for development prerequisites and guidelines. **Important**: All UI contributions must follow the astronomy design system defined in [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).

## License

AirAstro is released under the [MIT License](LICENSE).
