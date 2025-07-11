import { Request, Response } from "express";
import {
  checkForUpdate,
  downloadUpdate,
  getUpdateLogs,
  installUpdate,
  listBackups,
  rebootSystem,
  rollbackUpdate,
} from "../services/update.service";

import { promises as fs } from "fs";
import path from "path";

export async function checkUpdate(req: Request, res: Response) {
  try {
    const info = await checkForUpdate();
    res.json(info);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function downloadUpdateHandler(req: Request, res: Response) {
  try {
    const archive = await downloadUpdate();
    if (!archive) {
      return res.json({ message: "Already up to date" });
    }
    res.json({ archive });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function installUpdateHandler(req: Request, res: Response) {
  try {
    const updatesDir = path.join(process.cwd(), "updates");
    const files = await fs.readdir(updatesDir);
    const archives = files.filter((f) => f.endsWith(".tar.gz")).sort();
    const latest = archives.pop();
    if (!latest) {
      return res.status(400).json({ error: "No downloaded update found" });
    }

    // Répondre immédiatement puis traiter l'installation
    res.json({
      message: "Update installation started",
      version: latest.replace("release-", "").replace(".tar.gz", ""),
      status: "processing",
    });

    // Traiter l'installation en arrière-plan
    installUpdate(path.join(updatesDir, latest)).catch((error) => {
      console.error("Installation failed:", error);
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function rollbackUpdateHandler(req: Request, res: Response) {
  try {
    const backups = await listBackups();
    if (backups.length === 0) {
      return res
        .status(400)
        .json({ error: "No backup available for rollback" });
    }

    // Répondre immédiatement puis traiter le rollback
    res.json({
      message: "Rollback started",
      backup: backups[0],
      status: "processing",
    });

    // Traiter le rollback en arrière-plan
    rollbackUpdate().catch((error) => {
      console.error("Rollback failed:", error);
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function listBackupsHandler(req: Request, res: Response) {
  try {
    const backups = await listBackups();
    res.json({ backups });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function rebootSystemHandler(req: Request, res: Response) {
  try {
    // Répondre immédiatement avant le redémarrage
    res.json({
      message: "Redémarrage du système en cours...",
      status: "rebooting",
    });

    // Traiter le redémarrage en arrière-plan
    rebootSystem().catch((error) => {
      console.error("Erreur lors du redémarrage:", error);
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function getUpdateLogsHandler(req: Request, res: Response) {
  try {
    const logs = await getUpdateLogs();
    res.json({ logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
