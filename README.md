# AirAstro

AirAstro is a monorepo aiming to create an open source alternative to commercial astrophotography controllers such as ASIAIR and Stellarmate. The project delivers:

- **iOS application** – a simple user interface to control astrophotography equipment.
- **Android application** – identical features and interface as the iOS app.
- **Raspberry Pi server** – Node.js service that runs INDI/ASCOM drivers and
  exposes control APIs.

The goal is to replicate the ASIAIR feature set while staying easy to use. The applications communicate with the server which is designed to run on a Raspberry Pi.

## Repository Structure

```
apps/          - Mobile applications
  ios/         - iOS specific code
  android/     - Android specific code
server/        - Node.js implementation of the Raspberry Pi server
```

## Using Open Source Drivers

AirAstro relies on the INDI and ASCOM projects to provide hardware support. This avoids the need to implement device drivers from scratch.

## Status

This repository currently contains folder placeholders only. Contributions are welcome to flesh out the server and mobile applications.

## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for development prerequisites and
guidelines.

## License

AirAstro is released under the [MIT License](LICENSE).
