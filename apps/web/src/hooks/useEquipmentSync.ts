import { useCallback, useEffect } from "react";

import { useAirAstroUrl } from "./useAirAstroUrl";
import { useEquipmentContext } from "../contexts/EquipmentContext";

/**
 * Hook pour synchroniser les équipements sélectionnés avec l'API
 */
export const useEquipmentSync = () => {
  const { selectedEquipment, setSelectedEquipment } = useEquipmentContext();
  const { buildApiUrl, isOnline } = useAirAstroUrl();

  // Fonction pour sauvegarder l'état sur l'API
  const saveEquipmentState = useCallback(async () => {
    if (!isOnline) return;

    try {
      const response = await fetch(buildApiUrl("/api/equipment/context"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          selectedMount: selectedEquipment.mount?.id,
          selectedMainCamera: selectedEquipment.mainCamera?.id,
          selectedGuideCamera: selectedEquipment.guideCamera?.id,
          selectedFocuser: selectedEquipment.focuser?.id,
          selectedFilterWheel: selectedEquipment.filterWheel?.id,
          mainFocalLength: selectedEquipment.mainFocalLength,
          guideFocalLength: selectedEquipment.guideFocalLength,
        }),
      });

      if (!response.ok) {
        console.warn("Erreur lors de la sauvegarde de l'état des équipements");
        return;
      }

      const data = await response.json();
      console.log(
        "✅ Contexte d'équipement sauvegardé sur le serveur:",
        data.summary
      );
    } catch (error) {
      console.warn(
        "Erreur lors de la sauvegarde de l'état des équipements:",
        error
      );
    }
  }, [selectedEquipment, buildApiUrl, isOnline]);

  // Fonction pour charger l'état depuis l'API
  const loadEquipmentState = useCallback(async () => {
    if (!isOnline) return;

    try {
      const response = await fetch(buildApiUrl("/api/equipment/context"));

      if (!response.ok) {
        console.warn("Erreur lors du chargement de l'état des équipements");
        return;
      }

      const data = await response.json();

      // Vérifier si le serveur a un contexte sauvegardé
      if (data.hasContext && data.context) {
        console.log(
          "📋 Contexte d'équipement chargé depuis le serveur:",
          data.summary
        );

        // Récupérer la liste complète des équipements pour obtenir les détails
        const equipmentResponse = await fetch(buildApiUrl("/api/equipment"));

        if (equipmentResponse.ok) {
          const equipmentData = await equipmentResponse.json();
          const equipment = equipmentData.equipment || [];

          // Créer un contexte avec les équipements complets
          const newContext = {
            mount: data.context.selectedMount
              ? equipment.find((e: any) => e.id === data.context.selectedMount)
              : undefined,
            mainCamera: data.context.selectedMainCamera
              ? equipment.find(
                  (e: any) => e.id === data.context.selectedMainCamera
                )
              : undefined,
            guideCamera: data.context.selectedGuideCamera
              ? equipment.find(
                  (e: any) => e.id === data.context.selectedGuideCamera
                )
              : undefined,
            focuser: data.context.selectedFocuser
              ? equipment.find(
                  (e: any) => e.id === data.context.selectedFocuser
                )
              : undefined,
            filterWheel: data.context.selectedFilterWheel
              ? equipment.find(
                  (e: any) => e.id === data.context.selectedFilterWheel
                )
              : undefined,
            mainFocalLength: data.context.mainFocalLength || 1000,
            guideFocalLength: data.context.guideFocalLength || 240,
          };

          setSelectedEquipment(newContext);
        } else {
          // Fallback si on ne peut pas récupérer les équipements
          console.warn("Impossible de récupérer les détails des équipements");
        }
      } else {
        console.log("📋 Aucun contexte d'équipement trouvé sur le serveur");
      }
    } catch (error) {
      console.warn(
        "Erreur lors du chargement de l'état des équipements:",
        error
      );
    }
  }, [buildApiUrl, isOnline, setSelectedEquipment]);

  // Fonction pour effacer le contexte
  const clearEquipmentState = useCallback(async () => {
    if (!isOnline) return;

    try {
      const response = await fetch(buildApiUrl("/api/equipment/context"), {
        method: "DELETE",
      });

      if (!response.ok) {
        console.warn("Erreur lors de la suppression du contexte d'équipement");
        return;
      }

      console.log("🗑️ Contexte d'équipement effacé sur le serveur");

      // Réinitialiser le contexte local
      setSelectedEquipment({
        mount: undefined,
        mainCamera: undefined,
        guideCamera: undefined,
        focuser: undefined,
        filterWheel: undefined,
        mainFocalLength: 1000,
        guideFocalLength: 240,
      });
    } catch (error) {
      console.warn(
        "Erreur lors de la suppression du contexte d'équipement:",
        error
      );
    }
  }, [buildApiUrl, isOnline, setSelectedEquipment]);

  // Charger l'état au montage
  useEffect(() => {
    loadEquipmentState();
  }, [loadEquipmentState]);

  // Sauvegarder l'état à chaque changement (avec un délai pour éviter trop de requêtes)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveEquipmentState();
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [saveEquipmentState]);

  return {
    saveEquipmentState,
    loadEquipmentState,
    clearEquipmentState,
  };
};

/**
 * Hook pour obtenir les informations d'un équipement sélectionné
 */
export const useSelectedEquipment = (
  type: "mount" | "mainCamera" | "guideCamera" | "focuser" | "filterWheel"
) => {
  const { selectedEquipment } = useEquipmentContext();

  return selectedEquipment[type];
};

/**
 * Hook pour vérifier si des équipements sont prêts pour une session
 */
export const useEquipmentReadiness = () => {
  const { selectedEquipment } = useEquipmentContext();

  const hasEssentialEquipment = !!(
    selectedEquipment.mainCamera &&
    selectedEquipment.mainCamera.status === "connected"
  );

  const hasFullSetup = !!(
    selectedEquipment.mount &&
    selectedEquipment.mount.status === "connected" &&
    selectedEquipment.mainCamera &&
    selectedEquipment.mainCamera.status === "connected"
  );

  const hasGuidingSetup = !!(
    selectedEquipment.guideCamera &&
    selectedEquipment.guideCamera.status === "connected"
  );

  return {
    hasEssentialEquipment,
    hasFullSetup,
    hasGuidingSetup,
    isReady: hasEssentialEquipment,
    readinessScore: [
      selectedEquipment.mount?.status === "connected",
      selectedEquipment.mainCamera?.status === "connected",
      selectedEquipment.guideCamera?.status === "connected",
      selectedEquipment.focuser?.status === "connected",
      selectedEquipment.filterWheel?.status === "connected",
    ].filter(Boolean).length,
  };
};
