import { useEffect, useState, useCallback } from 'react';

export interface DetectedEquipment {
  id: string;
  name: string;
  type: 'mount' | 'camera' | 'focuser' | 'filter-wheel' | 'guide-camera' | 'unknown';
  manufacturer: string;
  model: string;
  connection: 'usb' | 'serial' | 'network';
  driverStatus: 'not-found' | 'found' | 'installed' | 'running';
  autoInstallable: boolean;
  confidence: number;
  status: 'disconnected' | 'connected' | 'error' | 'configuring';
  lastSeen?: Date;
  errorMessage?: string;
}

export interface EquipmentSummary {
  totalCount: number;
  connectedCount: number;
  isMonitoring: boolean;
  isSetupInProgress: boolean;
}

export interface AutoSetupResult {
  totalDevices: number;
  configured: number;
  failed: number;
  successRate: number;
  errors: string[];
}

export interface UseEquipmentResult {
  equipment: DetectedEquipment[];
  summary: EquipmentSummary;
  loading: boolean;
  error: string | null;
  refreshEquipment: () => Promise<void>;
  performAutoSetup: () => Promise<AutoSetupResult>;
  setupDevice: (deviceId: string) => Promise<boolean>;
  restartDevice: (deviceId: string) => Promise<boolean>;
  scanEquipment: () => Promise<void>;
}

export function useEquipment(): UseEquipmentResult {
  const [equipment, setEquipment] = useState<DetectedEquipment[]>([]);
  const [summary, setSummary] = useState<EquipmentSummary>({
    totalCount: 0,
    connectedCount: 0,
    isMonitoring: false,
    isSetupInProgress: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshEquipment = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/equipment');
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Convertir les dates
      const equipmentWithDates = data.equipment.map((item: any) => ({
        ...item,
        lastSeen: item.lastSeen ? new Date(item.lastSeen) : undefined
      }));
      
      setEquipment(equipmentWithDates);
      setSummary({
        totalCount: data.totalCount,
        connectedCount: data.connectedCount,
        isMonitoring: data.isMonitoring,
        isSetupInProgress: data.isSetupInProgress
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      console.error('Erreur lors de la récupération des équipements:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const performAutoSetup = useCallback(async (): Promise<AutoSetupResult> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/equipment/auto-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Rafraîchir la liste des équipements
      await refreshEquipment();
      
      return data.result;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      console.error('Erreur lors de la configuration automatique:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refreshEquipment]);

  const setupDevice = useCallback(async (deviceId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/equipment/${deviceId}/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Rafraîchir la liste des équipements
      await refreshEquipment();
      
      return data.success;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      console.error(`Erreur lors de la configuration de l'équipement ${deviceId}:`, err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refreshEquipment]);

  const restartDevice = useCallback(async (deviceId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/equipment/${deviceId}/restart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Rafraîchir la liste des équipements
      await refreshEquipment();
      
      return data.success;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      console.error(`Erreur lors du redémarrage de l'équipement ${deviceId}:`, err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refreshEquipment]);

  const scanEquipment = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/equipment/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Convertir les dates
      const equipmentWithDates = data.equipment.map((item: any) => ({
        ...item,
        lastSeen: item.lastSeen ? new Date(item.lastSeen) : undefined
      }));
      
      setEquipment(equipmentWithDates);
      setSummary({
        totalCount: data.totalCount,
        connectedCount: data.connectedCount,
        isMonitoring: true,
        isSetupInProgress: false
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      console.error('Erreur lors du scan des équipements:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Chargement initial des équipements
  useEffect(() => {
    refreshEquipment();
  }, [refreshEquipment]);

  // Actualisation périodique (toutes les 30 secondes)
  useEffect(() => {
    const interval = setInterval(() => {
      refreshEquipment();
    }, 30000); // 30 secondes

    return () => clearInterval(interval);
  }, [refreshEquipment]);

  return {
    equipment,
    summary,
    loading,
    error,
    refreshEquipment,
    performAutoSetup,
    setupDevice,
    restartDevice,
    scanEquipment
  };
}
