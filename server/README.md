# AirAstro Server

This directory contains the Node.js service that runs on the Raspberry Pi. The server will be responsible for interacting with INDI/ASCOM drivers and exposing APIs for the mobile applications.

## Requirements

- Node.js 20 or later

## Development

Install dependencies and start the server:

```bash
npm install
npm run build
npm start
```

For development you can run `npm run dev` to start the server using `ts-node` without building.

The server listens on the port specified by the `PORT` environment variable (defaults to `3000`). A simple health check endpoint is available at `/api/ping`.

### Web Interface

The install script and update process automatically build the web application located in `apps/web`. Once built, the generated `dist/` directory is served automatically. While connected to the AirAstro Wi-Fi you can navigate to `http://airastro.local` in your browser to use the interface.

### Update API

The Pi can check for new versions of AirAstro using GitHub releases. Three endpoints are exposed:

1. `GET /api/update/check` – returns information about the latest release and whether an update is available.
2. `POST /api/update/download` – downloads the latest release archive when an update is available.
3. `POST /api/update/install` – installs the downloaded archive, backing up the current server before replacing it.

If installation fails the backup is restored automatically. After a successful install the service should be restarted to run the new code.

## Wi-Fi Hotspot

On boot the Raspberry Pi automatically starts a Wi-Fi hotspot so that the mobile apps can connect directly. The hotspot SSID begins with `AirAstro-` followed by the last five characters of the Pi's hardware serial number. The default password is `123456789`.

The behaviour is implemented by `scripts/start-hotspot.js` and a companion systemd service file `scripts/start-hotspot.service`.

### Installation

1. Copy the service file and enable it:
   ```bash
   sudo cp server/scripts/start-hotspot.service /etc/systemd/system/
   sudo systemctl enable start-hotspot.service
   ```
2. Reboot the Raspberry Pi or start the service manually:
   ```bash
   sudo systemctl start start-hotspot.service
   ```

The script uses `nmcli` to create the hotspot on `wlan0`.

## Quick Install on Raspberry Pi

Run the following command on your Raspberry Pi to install AirAstro and configure all services:

```bash
curl -fsSL https://raw.githubusercontent.com/thibautrey/AirAstro/main/server/scripts/install-on-rpi.sh | bash
```

The script installs dependencies, clones this repository to `~/AirAstro`, builds the server and sets up systemd services for the server and Wi-Fi hotspot.
It also builds the web interface so it is immediately available after installation.


## Project Structure

The server code is organized using controllers, routes and services:

- **controllers** handle HTTP specifics and call into services.
- **services** implement the business logic (currently mostly placeholders).
- **routes** wire controllers to Express routers.

Additional services such as camera control, plate solving or guiding are defined
as stubs in the `services` directory for future development.

### Image Library API

A small image library is available to manage pictures captured by the system.
Images can be marked as `temporary` (for plate solving or guiding) or
`permanent`. The following endpoints are provided:

- `POST /api/images` – register a new image (placeholder implementation).
- `GET /api/images` – list images, filterable by type.
- `GET /api/images/:id` – retrieve information about a single image.
- `DELETE /api/images/:id` – remove an image from the library.

These endpoints currently store data in memory and will be expanded in the
future to handle real files.
