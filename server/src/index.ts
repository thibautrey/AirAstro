import express, { Request, Response } from "express";

import { DriverManager } from "./indi";
import bonjour from "bonjour";
import cors from "cors";
import imageRouter from "./routes/image.route";
import path from "path";
import updateRouter from "./routes/update.route";

const app = express();
const bonjourInstance = bonjour();

// Enable CORS for all routes
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://airastro.local",
      "http://10.42.0.1",
    ],
    credentials: true,
  })
);

app.use(express.json());
const port: number = parseInt(process.env.PORT ?? "80", 10);
const driverManager = new DriverManager();

app.get("/api/ping", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.use("/api/update", updateRouter);
app.use("/api/images", imageRouter);

// Serve the web UI built from apps/web
const webDir = path.resolve(__dirname, "../..", "apps/web/dist");
app.use(express.static(webDir));

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

// Fallback to index.html for SPA routes
app.get("*", (_req: Request, res: Response) => {
  res.sendFile(path.join(webDir, "index.html"));
});

app.listen(port, () => {
  console.log(`AirAstro server listening on port ${port}`);

  // Annonce le service mDNS avec le nom airastro.local
  const service = bonjourInstance.publish({
    name: "airastro",
    type: "http",
    port: port,
    txt: {
      description: "AirAstro Astronomy Server",
      version: "0.0.1",
    },
  });

  service.on("up", () => {
    console.log("✅ Service airastro.local announced on network");
  });

  service.on("error", (err: Error) => {
    console.error("❌ mDNS service error:", err);
  });

  // Arrêt propre du service mDNS lors de l'arrêt du serveur
  process.on("SIGINT", () => {
    console.log("\n🛑 Shutting down server...");
    service.stop();
    bonjourInstance.destroy();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.log("\n🛑 Shutting down server...");
    service.stop();
    bonjourInstance.destroy();
    process.exit(0);
  });
});
