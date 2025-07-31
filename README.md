# AirAstro

**AirAstro** is an open source controller for astrophotography. It lets you run modern capture software on a tiny Raspberry Pi and control a wide range of telescopes and cameras without being locked to a single vendor.

- **Works with many brands** – AirAstro uses the INDI/ASCOM driver projects and now offers experimental support for INDIGO for hot‑plug devices. Set `DRIVER_BACKEND=indigo` to try it.
- **Based on open hardware** – the server runs on a standard Raspberry Pi and the code is completely free to use.
- **Simple to set up** – install the server with a single command and access it from your phone or computer.

## Getting Started

1. Prepare a Raspberry Pi with Raspberry Pi OS.
2. Run our one‑line installer:

   ```bash
   curl -sSL https://raw.githubusercontent.com/thibautrey/AirAstro/main/server/scripts/install-on-rpi.sh | bash
   ```
3. Once finished, open `http://airastro.local` in your browser to start using the web interface or mobile apps.

A detailed guide is available in [docs/RASPBERRY_PI_INSTALLATION.md](docs/RASPBERRY_PI_INSTALLATION.md).

## Technical Documentation

Looking for implementation details or design guidelines? See the [docs](docs/) folder for all technical documentation including the [design system](docs/DESIGN_SYSTEM.md). Information about the ongoing INDIGO migration is available in [docs/INDIGO_MIGRATION.md](docs/INDIGO_MIGRATION.md).

## License

AirAstro is released under the [MIT License](LICENSE).
