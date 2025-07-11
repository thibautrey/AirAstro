import { Router } from "express";
import {
  checkUpdate,
  downloadUpdateHandler,
  installUpdateHandler,
  rollbackUpdateHandler,
  listBackupsHandler,
  rebootSystemHandler,
  getUpdateLogsHandler,
} from "../controllers/update.controller";

const router = Router();

router.get("/check", checkUpdate);
router.post("/download", downloadUpdateHandler);
router.post("/install", installUpdateHandler);
router.post("/rollback", rollbackUpdateHandler);
router.get("/backups", listBackupsHandler);
router.post("/reboot", rebootSystemHandler);
router.get("/logs", getUpdateLogsHandler);

export default router;
