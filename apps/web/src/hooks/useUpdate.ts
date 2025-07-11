import { UpdateInfo, UpdateStatus } from "../types/update";
import { useCallback, useMemo, useState } from "react";

import UpdateService from "../services/updateService";
import { useAirAstroUrl } from "./useAirAstroUrl";

export function useUpdate() {
  const { baseUrl } = useAirAstroUrl();
  const [status, setStatus] = useState<UpdateStatus>(UpdateStatus.IDLE);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateService = useMemo(() => {
    return baseUrl ? new UpdateService(baseUrl) : null;
  }, [baseUrl]);

  const checkForUpdate = useCallback(async () => {
    if (!updateService) {
      setError("Service de mise à jour non disponible");
      return;
    }

    setStatus(UpdateStatus.CHECKING);
    setError(null);

    try {
      const info = await updateService.checkForUpdate();
      setUpdateInfo(info);
      setStatus(
        info.updateAvailable ? UpdateStatus.AVAILABLE : UpdateStatus.IDLE
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setStatus(UpdateStatus.ERROR);
    }
  }, [updateService]);

  const downloadAndInstallUpdate = useCallback(async () => {
    if (!updateInfo?.updateAvailable || !updateService) return;

    try {
      // Phase de téléchargement
      setStatus(UpdateStatus.DOWNLOADING);
      setError(null);

      const downloadResult = await updateService.downloadUpdate();
      if (!downloadResult.archive) {
        throw new Error("Aucune archive téléchargée");
      }

      // Phase d'installation
      setStatus(UpdateStatus.INSTALLING);

      await updateService.installUpdate();

      setStatus(UpdateStatus.COMPLETED);
      setUpdateInfo(null); // Reset après installation
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setStatus(UpdateStatus.ERROR);
    }
  }, [updateInfo, updateService]);

  const resetUpdate = useCallback(() => {
    setStatus(UpdateStatus.IDLE);
    setUpdateInfo(null);
    setError(null);
  }, []);

  return {
    status,
    updateInfo,
    error,
    checkForUpdate,
    downloadAndInstallUpdate,
    resetUpdate,
  };
}
