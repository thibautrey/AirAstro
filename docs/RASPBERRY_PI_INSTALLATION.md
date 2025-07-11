# Installing AirAstro on a Raspberry Pi

This guide explains how to prepare a Raspberry Pi and install the AirAstro server with a single command.

## 1. Prepare the Raspberry Pi

1. Download and install **Raspberry Pi Imager** from [raspberrypi.com](https://www.raspberrypi.com/software/).
2. Use the Imager to flash the latest **Raspberry Pi OS Lite** onto a microSD card.
3. Insert the card into the Raspberry Pi, connect it to your network and power it on.
4. Open a terminal on the Pi (or connect via SSH) and make sure you have internet access.

## 2. Install AirAstro

Run the following command on your Raspberry Pi. It downloads the project and installs all required packages automatically:

```bash
curl -sSL https://raw.githubusercontent.com/thibautrey/AirAstro/main/server/scripts/install-on-rpi.sh | bash
```

The script will clone the repository to `~/AirAstro` by default and set up the server. When it finishes, the web interface will be available at `http://airastro.local` on your local network.

## 3. Next Steps

- Access the web interface from any device on the same network.
- Connect your astrophotography equipment to the Raspberry Pi and power it on.
- Explore the mobile or web apps to start capturing images!

AirAstro is completely free and based on open hardware. You're welcome to check out the [technical documentation](./) for advanced configuration details.
