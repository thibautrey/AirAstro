import express, { Request, Response } from 'express';
import updateRouter from './routes/update.route';
import imageRouter from './routes/image.route';

const app = express();
const port: number = parseInt(process.env.PORT ?? '3000', 10);

app.use(express.json());

app.get('/api/ping', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.use('/api/update', updateRouter);
app.use('/api/images', imageRouter);

app.listen(port, () => {
  console.log(`AirAstro server listening on port ${port}`);
});
