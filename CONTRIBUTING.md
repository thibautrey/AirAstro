# Contributing to AirAstro

Thank you for your interest in contributing! This repository is divided into a
Raspberry Pi server and mobile applications for iOS and Android. Before you
start building, make sure your development environment is ready.

## Server Prerequisites

- **Node.js 20+** – the server is implemented with a lightweight Node.js
  framework.
- **INDI/ASCOM drivers** – install the appropriate drivers on your Raspberry Pi
  or Linux machine.
- **Raspberry Pi OS or similar** – the server targets a Raspberry Pi but should
  run on any Linux distribution once the dependencies are installed.

## Mobile App Prerequisites

- **iOS** – Xcode 14 or later on macOS is recommended. The iOS folder contains
  the application sources.
- **Android** – Android Studio (Hedgehog or newer) with the Android SDK.

These prerequisites let you build and run the individual projects. According to
[`AGENTS.md`](AGENTS.md), there are currently no automated tests, so you do not
need to run any test commands when contributing.

We welcome pull requests that flesh out the project or improve documentation.
