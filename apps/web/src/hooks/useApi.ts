import { useCallback, useState } from "react";

import airAstroApiClient from "../services/airastro-api.service";

export interface UseApiResult<T = any> {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute: (endpoint: string, options?: RequestInit) => Promise<T>;
  get: (endpoint: string, options?: RequestInit) => Promise<T>;
  post: (endpoint: string, data?: any, options?: RequestInit) => Promise<T>;
  put: (endpoint: string, data?: any, options?: RequestInit) => Promise<T>;
  delete: (endpoint: string, options?: RequestInit) => Promise<T>;
  reset: () => void;
}

/**
 * Hook pour effectuer des appels API vers AirAstro
 */
export function useApi<T = any>(): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (endpoint: string, options?: RequestInit): Promise<T> => {
      setLoading(true);
      setError(null);

      try {
        const result = await airAstroApiClient.request(endpoint, options);
        setData(result);
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erreur inconnue";
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const get = useCallback(
    async (endpoint: string, options?: RequestInit): Promise<T> => {
      return execute(endpoint, { ...options, method: "GET" });
    },
    [execute]
  );

  const post = useCallback(
    async (endpoint: string, data?: any, options?: RequestInit): Promise<T> => {
      return execute(endpoint, {
        ...options,
        method: "POST",
        body: data ? JSON.stringify(data) : undefined,
        headers: {
          "Content-Type": "application/json",
          ...options?.headers,
        },
      });
    },
    [execute]
  );

  const put = useCallback(
    async (endpoint: string, data?: any, options?: RequestInit): Promise<T> => {
      return execute(endpoint, {
        ...options,
        method: "PUT",
        body: data ? JSON.stringify(data) : undefined,
        headers: {
          "Content-Type": "application/json",
          ...options?.headers,
        },
      });
    },
    [execute]
  );

  const deleteRequest = useCallback(
    async (endpoint: string, options?: RequestInit): Promise<T> => {
      return execute(endpoint, { ...options, method: "DELETE" });
    },
    [execute]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    get,
    post,
    put,
    delete: deleteRequest,
    reset,
  };
}
