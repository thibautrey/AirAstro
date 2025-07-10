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
