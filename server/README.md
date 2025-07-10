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