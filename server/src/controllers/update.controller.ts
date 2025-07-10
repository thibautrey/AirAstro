import { Request, Response } from 'express';
import { checkForUpdate, downloadUpdate, installUpdate } from '../services/update.service';
import path from 'path';
import { promises as fs } from 'fs';

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
      return res.json({ message: 'Already up to date' });
    }
    res.json({ archive });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function installUpdateHandler(req: Request, res: Response) {
  try {
    const files = await fs.readdir('updates');
    const archives = files.filter(f => f.endsWith('.tar.gz')).sort();
    const latest = archives.pop();
    if (!latest) {
      return res.status(400).json({ error: 'No downloaded update found' });
    }
    await installUpdate(path.join('updates', latest));
    res.json({ installed: latest });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
