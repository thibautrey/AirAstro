import {
  connectAllDevices,
  getAvailableDevices,
  getEquipmentStatus,
  getIndiStatus,
  startImagingSequence,
} from "../controllers/indi.controller";

import { Router } from "express";

const router = Router();

// Routes pour la gestion INDI
router.get("/status", getIndiStatus);
router.get("/devices", getAvailableDevices);
router.get("/equipment/status", getEquipmentStatus);
router.post("/equipment/connect", connectAllDevices);

// Routes pour les séquences d'imagerie
router.post("/imaging/sequence", startImagingSequence);

export default router;
