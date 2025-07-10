import express, { Request, Response } from "express";

import { DriverManager } from "./indi";
import imageRouter from "./routes/image.route";
import updateRouter from "./routes/update.route";

const app = express();
app.use(express.json());
const port: number = parseInt(process.env.PORT ?? "3000", 10);
const driverManager = new DriverManager();

app.use(express.json());

app.get("/api/ping", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.use("/api/update", updateRouter);
app.use("/api/images", imageRouter);

app.get("/api/drivers", async (_req: Request, res: Response) => {
  try {
    const installed = await driverManager.getInstalledDrivers();
    const running = driverManager.listRunningDrivers();
    res.json({ installed, running });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/drivers/available", async (_req: Request, res: Response) => {
  try {
    const drivers = await driverManager.getAvailableDrivers();
    res.json(drivers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/drivers/search", async (req: Request, res: Response) => {
  const query = (req.query.q as string) ?? "";
  if (!query) {
    return res.json([]);
  }
  try {
    const results = await driverManager.searchDrivers(query);
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/drivers/usb", async (_req: Request, res: Response) => {
  try {
    const devices = await driverManager.listUsbDevices();
    res.json(devices);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/drivers/start", async (req: Request, res: Response) => {
  const { name } = req.body as { name?: string };
  if (!name) {
    return res.status(400).json({ error: "Driver name required" });
  }
  try {
    await driverManager.startDriver(name);
    res.json({ started: name });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/drivers/stop", async (req: Request, res: Response) => {
  const { name } = req.body as { name?: string };
  if (!name) {
    return res.status(400).json({ error: "Driver name required" });
  }
  try {
    await driverManager.stopDriver(name);
    res.json({ stopped: name });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/drivers/install", async (req: Request, res: Response) => {
  const { name } = req.body as { name?: string };
  if (!name) {
    return res.status(400).json({ error: "Driver name required" });
  }
  try {
    await driverManager.installDriver(name);
    res.json({ installed: name });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`AirAstro server listening on port ${port}`);
});
