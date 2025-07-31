import { Request, Response } from "express";

import {
  driverIntegrationService,
  driverBackend,
} from "../services/driver-backend.service";

export async function getEquipmentStatus(req: Request, res: Response) {
  try {
    const status = await driverIntegrationService.getDeviceStatus();
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getAvailableDevices(req: Request, res: Response) {
  try {
    const devices = await driverIntegrationService.getAvailableDevices();
    res.json(devices);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function connectAllDevices(req: Request, res: Response) {
  try {
    await driverIntegrationService.connectAllDevices();
    res.json({ success: true, message: "Tous les appareils connectés" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function startImagingSequence(req: Request, res: Response) {
  try {
    const { targets } = req.body;
    if (!targets || !Array.isArray(targets)) {
      return res.status(400).json({ error: "Targets array required" });
    }

    await driverIntegrationService.runImagingSequence(targets);
    res.json({ success: true, message: "Séquence d'imagerie démarrée" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getIndiStatus(req: Request, res: Response) {
  try {
    const client = driverIntegrationService.getIndiClient();
    const devices = client.getDevices();

    const status = {
      connected: devices.length > 0,
      deviceCount: devices.length,
      devices: devices.map((deviceName: string) => {
        const device = client.getDevice(deviceName);
        return {
          name: deviceName,
          propertyCount: device ? device.properties.size : 0,
          connected: device
            ? device.properties.get("CONNECTION")?.elements.get("CONNECT")
                ?.value === "On"
            : false,
        };
      }),
    };

    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
