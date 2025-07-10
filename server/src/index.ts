import express, { Request, Response } from 'express';
import path from 'path';
import { promises as fs } from 'fs';
import { checkForUpdate, downloadUpdate, installUpdate } from './update';

const app = express();
const port: number = parseInt(process.env.PORT ?? '3000', 10);

app.get('/api/ping', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.get('/api/update/check', async (_req: Request, res: Response) => {
  try {
    const info = await checkForUpdate();
    res.json(info);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/update/download', async (_req: Request, res: Response) => {
  try {
    const archive = await downloadUpdate();
    if (!archive) {
      return res.json({ message: 'Already up to date' });
    }
    res.json({ archive });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/update/install', async (_req: Request, res: Response) => {
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
});

app.listen(port, () => {
  console.log(`AirAstro server listening on port ${port}`);
});
