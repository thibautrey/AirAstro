import "dotenv/config";

import express, { Request, Response } from "express";

import { DriverManager } from "./indi";
import { EquipmentDatabaseService } from "./services/equipment-database.service";
import bonjour from "bonjour";
import cors from "cors";
import equipmentRouter from "./routes/equipment.route";
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

// Configuration du port avec gestion des erreurs
const DEFAULT_PORT = 3000;
const requestedPort = parseInt(process.env.PORT ?? DEFAULT_PORT.toString(), 10);

// Validation du port
const port =
  requestedPort >= 1 && requestedPort <= 65535 ? requestedPort : DEFAULT_PORT;

if (port !== requestedPort) {
  console.warn(
    `⚠️  Port ${requestedPort} invalide, utilisation du port ${port}`
  );
}

const driverManager = new DriverManager();

// Initialisation de la base de données d'équipements
const equipmentDatabase = new EquipmentDatabaseService();

// Initialisation asynchrone de la base de données
async function initializeServices() {
  try {
    console.log("🔄 Initialisation des services...");
    await equipmentDatabase.initializeDatabase();
    console.log("✅ Services initialisés avec succès");
  } catch (error) {
    console.error("❌ Erreur lors de l'initialisation des services:", error);
    console.log("⚠️  Poursuite avec la base de données par défaut");
  }
}

// Lancer l'initialisation
initializeServices();

app.get("/api/ping", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.use("/api/update", updateRouter);
app.use("/api/images", imageRouter);
app.use("/api/equipment", equipmentRouter);

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

// Gestion des erreurs de serveur
const server = app.listen(port, () => {
  console.log(`🚀 AirAstro server running on port ${port}`);
  console.log(`🌐 Local access: http://localhost:${port}`);

  // Affichage conditionnel en fonction du port
  if (port === 80) {
    console.log(`🔗 Network access: http://airastro.local`);
  } else {
    console.log(`🔗 Network access: http://airastro.local:${port}`);
  }

  console.log(`📡 mDNS discovery: Dual-layer (System + Application)`);

  // Configuration mDNS au niveau application (complément du système)
  const service = bonjourInstance.publish({
    name: "airastro",
    type: "http",
    port: port,
    txt: {
      description: "AirAstro Astronomy Server",
      version: "0.0.1",
      layer: "application", // Indique que c'est la couche application
      systemMdns: "enabled", // Indique que mDNS système est actif
      features: "imaging,guiding,platesolving,scheduler",
      interface: "web",
      path: "/",
    },
  });

  service.on("up", () => {
    console.log("✅ Application mDNS service announced");
    console.log("   Note: System-level mDNS is also active via Avahi");
  });

  service.on("error", (err: Error) => {
    console.error("❌ Application mDNS service error:", err);
    console.log("   System-level mDNS via Avahi should still work");
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

// Gestion des erreurs de serveur
server.on("error", (err: any) => {
  if (err.code === "EACCES") {
    console.error(`❌ Permission denied for port ${port}`);
    console.error(`💡 Solutions possibles:`);
    console.error(`   1. Utiliser un port > 1024 (ex: PORT=3000)`);
    console.error(`   2. Lancer avec sudo (non recommandé)`);
    console.error(
      `   3. Configurer les capacités: sudo setcap 'cap_net_bind_service=+ep' $(which node)`
    );
    process.exit(1);
  } else if (err.code === "EADDRINUSE") {
    console.error(`❌ Port ${port} déjà utilisé`);
    console.error(`💡 Solutions possibles:`);
    console.error(`   1. Utiliser un autre port (ex: PORT=3001)`);
    console.error(`   2. Arrêter le processus utilisant ce port`);
    process.exit(1);
  } else {
    console.error(`❌ Erreur serveur:`, err);
    process.exit(1);
  }
});
