# Guidelines for Codex Agents

This repository is a monorepo consisting of mobile applications and a Raspberry Pi server. The folder layout is:

- `apps/ios` – iOS application sources
- `apps/android` – Android application sources
- `server` – server side code intended for Raspberry Pi

## Design System

AirAstro follows a strict design system optimized for astronomy applications. **All UI components must comply with the astronomy-friendly color palette** defined in `DESIGN_SYSTEM.md`:

### Mandatory Color Scheme

- **Backgrounds**: Black (`#000000`) and dark grays (`#1A1A1A`, `#2D2D2D`)
- **Text**: White (`#FFFFFF`) for primary text, light gray (`#B0B0B0`) for secondary
- **Buttons**: Green (`#00AA00`) for primary actions, Blue (`#0080FF`, `#2563eb`) for secondary actions and alerts
- **Alerts**: Blue (`#2563eb`) for important notifications and alerts
- **Errors**: Red (`#FF4444`) for critical errors only
- **Status**: Green for success, Orange (`#FFAA00`) for warnings, Red for critical errors

### Design Principles

1. **Preserve Night Vision**: Use red tones for critical alerts, avoid bright whites in large areas
2. **High Contrast**: Ensure excellent readability in dark environments
3. **Consistent Spacing**: Use 8pt grid system (8pt, 16pt, 24pt, 32pt, etc.)
4. **Modern UI**: Clean, minimal design with subtle shadows and rounded corners

### Implementation Notes

- Always use the predefined color constants from the design system
- Test UI in dark environments to ensure usability
- Maintain consistent component styling across all screens
- Use appropriate font weights and sizes as specified in the design system

There are no automated tests yet. Agents do not need to run any test commands when modifying files.
