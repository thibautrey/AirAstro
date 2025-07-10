/**
 * Service pour gérer l'URL de base d'AirAstro
 * Détecte automatiquement l'instance AirAstro et stocke son URL
 */

const AIRASTRO_BASE_URL_KEY = "airastro-base-url";
const AIRASTRO_DETECTION_KEY = "airastro-detection-info";

export interface AirAstroInstance {
  baseUrl: string;
  detectedAt: Date;
  method: "direct" | "mdns" | "network-scan" | "manual";
  isOnline: boolean;
  lastCheck: Date;
}

class AirAstroUrlService {
  private static instance: AirAstroUrlService;
  private baseUrl: string | null = null;
  private detectionInfo: AirAstroInstance | null = null;

  private constructor() {
    this.loadStoredUrl();
  }

  public static getInstance(): AirAstroUrlService {
    if (!AirAstroUrlService.instance) {
      AirAstroUrlService.instance = new AirAstroUrlService();
    }
    return AirAstroUrlService.instance;
  }

  /**
   * Charge l'URL stockée depuis le localStorage
   */
  private loadStoredUrl(): void {
    try {
      const storedUrl = localStorage.getItem(AIRASTRO_BASE_URL_KEY);
      const storedInfo = localStorage.getItem(AIRASTRO_DETECTION_KEY);

      if (storedUrl && storedInfo) {
        this.baseUrl = storedUrl;
        this.detectionInfo = JSON.parse(storedInfo);

        // Convertir les dates
        if (this.detectionInfo) {
          this.detectionInfo.detectedAt = new Date(
            this.detectionInfo.detectedAt
          );
          this.detectionInfo.lastCheck = new Date(this.detectionInfo.lastCheck);
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement de l'URL AirAstro:", error);
      this.clearStoredUrl();
    }
  }

  /**
   * Sauvegarde l'URL dans le localStorage
   */
  private saveUrl(): void {
    try {
      if (this.baseUrl && this.detectionInfo) {
        localStorage.setItem(AIRASTRO_BASE_URL_KEY, this.baseUrl);
        localStorage.setItem(
          AIRASTRO_DETECTION_KEY,
          JSON.stringify(this.detectionInfo)
        );
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde de l'URL AirAstro:", error);
    }
  }

  /**
   * Supprime l'URL stockée
   */
  private clearStoredUrl(): void {
    try {
      localStorage.removeItem(AIRASTRO_BASE_URL_KEY);
      localStorage.removeItem(AIRASTRO_DETECTION_KEY);
      this.baseUrl = null;
      this.detectionInfo = null;
    } catch (error) {
      console.error("Erreur lors de la suppression de l'URL AirAstro:", error);
    }
  }

  /**
   * Détecte automatiquement l'instance AirAstro
   */
  public async detectAirAstro(): Promise<AirAstroInstance | null> {
    console.log("🔍 Détection de l'instance AirAstro...");

    // 1. Tester l'URL actuelle (si on est déjà sur AirAstro)
    const currentUrl = this.getCurrentUrl();
    if (await this.testAirAstroUrl(currentUrl)) {
      return this.setAirAstroUrl(currentUrl, "direct");
    }

    // 2. Tester les URLs mDNS communes
    const mdnsUrls = [
      "http://airastro.local",
      "http://airastro.local:3000",
      "http://airastro.local:80",
    ];

    for (const url of mdnsUrls) {
      if (await this.testAirAstroUrl(url)) {
        return this.setAirAstroUrl(url, "mdns");
      }
    }

    // 3. Scanner le réseau local (IPs communes)
    const networkUrls = [
      "http://192.168.1.1:3000",
      "http://192.168.1.10:3000",
      "http://192.168.1.100:3000",
      "http://192.168.0.1:3000",
      "http://192.168.0.10:3000",
      "http://192.168.0.100:3000",
      "http://10.42.0.1:3000", // Hotspot Raspberry Pi
      "http://10.42.0.1:80",
    ];

    for (const url of networkUrls) {
      if (await this.testAirAstroUrl(url)) {
        return this.setAirAstroUrl(url, "network-scan");
      }
    }

    console.warn("⚠️  Aucune instance AirAstro détectée automatiquement");
    return null;
  }

  /**
   * Teste si une URL pointe vers AirAstro
   */
  private async testAirAstroUrl(url: string): Promise<boolean> {
    try {
      const response = await fetch(`${url}/api/ping`, {
        method: "GET",
        mode: "cors",
        credentials: "omit",
        signal: AbortSignal.timeout(5000), // 5 secondes timeout
      });

      if (response.ok) {
        const data = await response.json();
        return data.status === "ok";
      }
    } catch (error) {
      // Silencieux pour ne pas polluer les logs
    }
    return false;
  }

  /**
   * Définit l'URL d'AirAstro
   */
  private setAirAstroUrl(
    url: string,
    method: AirAstroInstance["method"]
  ): AirAstroInstance {
    this.baseUrl = url;
    this.detectionInfo = {
      baseUrl: url,
      detectedAt: new Date(),
      method,
      isOnline: true,
      lastCheck: new Date(),
    };

    this.saveUrl();
    console.log(`✅ AirAstro détecté via ${method}: ${url}`);

    return this.detectionInfo;
  }

  /**
   * Obtient l'URL actuelle
   */
  private getCurrentUrl(): string {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = window.location.port;

    if (port && port !== "80" && port !== "443") {
      return `${protocol}//${hostname}:${port}`;
    }
    return `${protocol}//${hostname}`;
  }

  /**
   * Vérifie si l'instance AirAstro est toujours en ligne
   */
  public async checkOnlineStatus(): Promise<boolean> {
    if (!this.baseUrl) return false;

    const isOnline = await this.testAirAstroUrl(this.baseUrl);

    if (this.detectionInfo) {
      this.detectionInfo.isOnline = isOnline;
      this.detectionInfo.lastCheck = new Date();
      this.saveUrl();
    }

    return isOnline;
  }

  /**
   * Obtient l'URL de base pour les appels API
   */
  public getBaseUrl(): string | null {
    return this.baseUrl;
  }

  /**
   * Obtient les informations de détection
   */
  public getDetectionInfo(): AirAstroInstance | null {
    return this.detectionInfo;
  }

  /**
   * Construit une URL API complète
   */
  public buildApiUrl(endpoint: string): string {
    if (!this.baseUrl) {
      throw new Error(
        "URL de base AirAstro non définie. Appelez detectAirAstro() d'abord."
      );
    }

    // Nettoyer l'endpoint
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

    return `${this.baseUrl}${cleanEndpoint}`;
  }

  /**
   * Définit manuellement l'URL d'AirAstro
   */
  public async setManualUrl(url: string): Promise<boolean> {
    if (await this.testAirAstroUrl(url)) {
      this.setAirAstroUrl(url, "manual");
      return true;
    }
    return false;
  }

  /**
   * Réinitialise la détection
   */
  public reset(): void {
    this.clearStoredUrl();
    console.log("🔄 Détection AirAstro réinitialisée");
  }
}

export default AirAstroUrlService.getInstance();
