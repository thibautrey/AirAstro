import { useEffect, useState, useCallback } from 'react';

export interface DetectedEquipment {
  id: string;
  name: string;
  type: 'mount' | 'camera' | 'focuser' | 'filter-wheel' | 'guide-camera' | 'dome' | 'weather' | 'aux' | 'unknown';
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
  forceUpdateDatabase: () => Promise<void>;
}

export function useEquipment(options?: { enablePolling?: boolean; pollingInterval?: number }): UseEquipmentResult {
  const { enablePolling = false, pollingInterval = 30000 } = options || {};
  
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

  const forceUpdateDatabase = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/equipment/database/update', {
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
      console.log('Base de données mise à jour:', data);
      
      // Rafraîchir la liste des équipements
      await refreshEquipment();
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      console.error('Erreur lors de la mise à jour de la base de données:', err);
    } finally {
      setLoading(false);
    }
  }, [refreshEquipment]);

  // Chargement initial des équipements
  useEffect(() => {
    refreshEquipment();
  }, [refreshEquipment]);

  // Actualisation périodique (seulement si enablePolling est true)
  useEffect(() => {
    if (!enablePolling) return;
    
    const interval = setInterval(() => {
      refreshEquipment();
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [refreshEquipment, enablePolling, pollingInterval]);

  return {
    equipment,
    summary,
    loading,
    error,
    refreshEquipment,
    performAutoSetup,
    setupDevice,
    restartDevice,
    scanEquipment,
    forceUpdateDatabase
  };
}
