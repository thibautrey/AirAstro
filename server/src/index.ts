import express, { Request, Response } from 'express';

const app = express();
const port: number = parseInt(process.env.PORT ?? '3000', 10);

app.get('/api/ping', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`AirAstro server listening on port ${port}`);
});
