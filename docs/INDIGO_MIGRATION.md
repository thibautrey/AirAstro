# Migrating to INDIGO

AirAstro currently relies on the INDI driver ecosystem. INDIGO is a modern fork
of INDI that provides hot‑plug detection, improved performance and a JSON based
communication layer. This document tracks the effort to adopt INDIGO as the
primary backend.

## Benefits of INDIGO

- **Hot plug** support for USB and network devices
- **JSON WebSocket API** for simpler clients
- **Driver compatibility** with INDI while adding new features

## Migration steps

1. Add a minimal INDIGO client in the server (`IndigoClient`).
2. Provide an integration service (`IndigoIntegrationService`) mirroring the
   current INDI service.
3. Gradually update services to use INDIGO when available.
4. Update installation scripts to start `indigo_server` instead of `indiserver`.

Both backends can coexist during the transition. Set the environment variable
`DRIVER_BACKEND=indigo` to enable the new integration. The install script will
automatically build or install **indigo_server** when this variable is set.
