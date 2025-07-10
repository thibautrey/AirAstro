# AirAstro Web Interface

This directory contains the web-based user interface for AirAstro. The UI is implemented using **React**, **TypeScript** and **Tailwind CSS** and follows the design system defined in the repository.

## Development

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

## Build

Generate the production build in `dist/`:

```bash
npm run build
```

The contents of `dist/` will be served automatically by the AirAstro server when running on the Raspberry Pi.
When installing or updating AirAstro on the Pi the build is performed automatically, so manual building is only required for local development.
