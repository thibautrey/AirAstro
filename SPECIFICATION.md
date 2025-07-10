# AirAstro Project Specification

## Overview
AirAstro aims to provide an open source alternative to commercial astrophotography controllers. As described in the README, it combines mobile apps with a Raspberry Pi server:

- **iOS application** – a simple user interface to control astrophotography equipment.
- **Android application** – identical features and interface as the iOS app.
- **Raspberry Pi server** – runs INDI/ASCOM drivers and exposes control APIs.

The goal is to replicate the ASIAIR feature set while remaining easy to use. The applications communicate with the server running on a Raspberry Pi.

## Repository Structure
The repository is organized as follows:

```
apps/          - Mobile applications
  ios/         - iOS specific code
  android/     - Android specific code
server/        - Raspberry Pi server implementation
```

## Target Features
The project aims to match or exceed the capabilities of existing commercial solutions. Key features include:

1. **Device Management**
   - Support INDI and ASCOM drivers for mounts, cameras, filter wheels, and focusers.
   - Automatic device discovery and configuration on the server.

2. **Imaging Control**
   - Capture single frames and sequences with configurable exposure and gain.
   - Preview images on the mobile app with focus and histogram tools.
   - Save images locally and optionally sync to cloud storage.

3. **Automated Workflow**
   - Polar alignment assistance and plate solving.
   - Auto-guiding support using a dedicated guide camera.
   - Automated focus routines for electronic focusers.
   - Sequencing and scheduling for long imaging sessions.

4. **Mobile Applications**
   - Cross-platform interface providing identical features on iOS and Android.
   - Connect to the server over Wi‑Fi and control equipment.
   - Monitor session progress, view log messages, and adjust settings.

5. **Server APIs**
   - HTTP or gRPC endpoints for all hardware control functions.
   - Web dashboard for initial setup and diagnostics.
   - Modular design allowing additional hardware support via plug‑ins.

6. **Usability and Reliability**
   - Simple onboarding process that hides Raspberry Pi complexity.
   - Error handling and recovery for unstable USB or network connections.
   - Logging and update mechanisms to keep the system secure and stable.

## Implementation Steps
The following high-level steps outline how to realize these features:

1. **Establish Baseline Server Environment**
   - Prepare Raspberry Pi images with INDI drivers and dependencies installed.
   - Implement a small Python (e.g. FastAPI) service that exposes hardware control functions through a network API.

2. **Define API Contracts**
   - Document endpoints for mount control, camera capture, focusing, guiding, and configuration.
   - Ensure the API supports asynchronous operations for long‑running tasks.

3. **Develop Mobile App Skeletons**
   - Create initial project setups for iOS and Android (optionally using a cross‑platform toolkit).
   - Implement basic connection management and an interface to invoke server APIs.

4. **Add Imaging Functions**
   - Build capture and live preview features that stream images from the server.
   - Integrate focusing and histogram tools to assist with achieving sharp images.

5. **Incorporate Alignment and Guiding**
   - Integrate plate solving libraries (e.g. ASTAP or local astrometry.net) via the server.
   - Provide a guiding module to keep the target centered during exposures.

6. **Session Sequencing and Automation**
   - Add scripting or configuration to run predefined imaging sequences.
   - Implement schedules and notifications for remote monitoring.

7. **Quality of Life Improvements**
   - Create a web dashboard for diagnostics and firmware updates.
   - Provide backup and restore mechanisms for configuration files.

8. **Documentation and Contributions**
   - Document build steps and developer setup for each subproject.
   - Encourage contributions by outlining guidelines and code structure.

## Future Work
- Expand device compatibility through community-developed plug‑ins.
- Add automated tests and continuous integration once the basic architecture is in place.
- Explore advanced features such as mosaic planning and weather monitoring.

