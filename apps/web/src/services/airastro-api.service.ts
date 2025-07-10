import airAstroUrlService from "../services/airastro-url.service";

/**
 * Wrapper pour les appels API qui utilise automatiquement l'URL de base détectée
 */
export class AirAstroApiClient {
  private static instance: AirAstroApiClient;

  private constructor() {}

  public static getInstance(): AirAstroApiClient {
    if (!AirAstroApiClient.instance) {
      AirAstroApiClient.instance = new AirAstroApiClient();
    }
    return AirAstroApiClient.instance;
  }

  /**
   * Effectue un appel GET
   */
  async get(endpoint: string, options?: RequestInit): Promise<Response> {
    const url = airAstroUrlService.buildApiUrl(endpoint);
    return fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...options?.headers,
      },
      ...options,
    });
  }

  /**
   * Effectue un appel POST
   */
  async post(
    endpoint: string,
    data?: any,
    options?: RequestInit
  ): Promise<Response> {
    const url = airAstroUrlService.buildApiUrl(endpoint);
    return fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  /**
   * Effectue un appel PUT
   */
  async put(
    endpoint: string,
    data?: any,
    options?: RequestInit
  ): Promise<Response> {
    const url = airAstroUrlService.buildApiUrl(endpoint);
    return fetch(url, {
      method: "PUT",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  /**
   * Effectue un appel DELETE
   */
  async delete(endpoint: string, options?: RequestInit): Promise<Response> {
    const url = airAstroUrlService.buildApiUrl(endpoint);
    return fetch(url, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...options?.headers,
      },
      ...options,
    });
  }

  /**
   * Effectue un appel avec gestion d'erreur automatique
   */
  async request(endpoint: string, options?: RequestInit): Promise<any> {
    try {
      const url = airAstroUrlService.buildApiUrl(endpoint);
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        let errorMessage = `Erreur HTTP: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // Ignore les erreurs de parsing JSON
        }
        throw new Error(errorMessage);
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return await response.json();
      }

      return await response.text();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Erreur de réseau ou serveur inaccessible");
    }
  }

  /**
   * Vérifie si le serveur est accessible
   */
  async ping(): Promise<boolean> {
    try {
      const response = await this.get("/api/ping");
      if (response.ok) {
        const data = await response.json();
        return data.status === "ok";
      }
      return false;
    } catch {
      return false;
    }
  }
}

export default AirAstroApiClient.getInstance();
