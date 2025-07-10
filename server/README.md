# Server

This directory contains the Raspberry Pi server code for AirAstro.

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

