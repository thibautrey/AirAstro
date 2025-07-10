import { UpdateInfo, UpdateStatus } from "../types/update";
import { useCallback, useState } from "react";

import UpdateService from "../services/updateService";

export function useUpdate(deviceUrl: string) {
  const [status, setStatus] = useState<UpdateStatus>(UpdateStatus.IDLE);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateService = new UpdateService(deviceUrl);

  const checkForUpdate = useCallback(async () => {
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
  }, [deviceUrl]);

  const downloadAndInstallUpdate = useCallback(async () => {
    if (!updateInfo?.updateAvailable) return;

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
  }, [updateInfo, deviceUrl]);

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
