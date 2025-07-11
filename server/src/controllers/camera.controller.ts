import { Request, Response } from "express";
import { CameraService } from "../services/camera.service";

// Singleton instance of the camera service
const cameraService = new CameraService();

export async function getCameras(req: Request, res: Response) {
  try {
    const cameras = await cameraService.getAvailableCameras();
    res.json(cameras);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function selectCamera(req: Request, res: Response) {
  try {
    const { cameraName } = req.body;
    if (!cameraName) {
      return res.status(400).json({ error: "Camera name required" });
    }

    await cameraService.selectCamera(cameraName);
    res.json({ success: true, selectedCamera: cameraName });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getCameraStatus(req: Request, res: Response) {
  try {
    const status = cameraService.getCameraStatus();
    const selectedCamera = cameraService.getSelectedCamera();
    const lastParameters = cameraService.getLastParameters();

    res.json({
      ...status,
      selectedCamera,
      lastParameters,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function updateParameters(req: Request, res: Response) {
  try {
    const parameters = req.body;
    await cameraService.updateParameters(parameters);

    const updatedParameters = cameraService.getLastParameters();
    res.json({ success: true, parameters: updatedParameters });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function startCapture(req: Request, res: Response) {
  try {
    const parameters = req.body;
    const captureId = await cameraService.startCapture(parameters);

    res.json({
      success: true,
      captureId,
      message: "Capture started",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function cancelCapture(req: Request, res: Response) {
  try {
    await cameraService.cancelCapture();
    res.json({ success: true, message: "Capture cancelled" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function setCooling(req: Request, res: Response) {
  try {
    const { enabled, targetTemperature } = req.body;
    await cameraService.setCooling(enabled, targetTemperature);

    res.json({ success: true, message: "Cooling configured" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getImageHistory(req: Request, res: Response) {
  try {
    const images = await cameraService.getImageHistory();
    res.json(images);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function deleteImage(req: Request, res: Response) {
  try {
    const { filename } = req.params;
    await cameraService.deleteImage(filename);
    res.json({ success: true, message: "Image deleted" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// Retrieve the service instance for WebSocket usage
export function getCameraService(): CameraService {
  return cameraService;
}
