import { useEffect, useState } from "react";

import AirAstroConnectionManager from "./AirAstroConnectionManager";
import EquipmentCard from "./EquipmentCard";
import EquipmentFilterInfo from "./EquipmentFilterInfo";
import EquipmentWarningModal from "./EquipmentWarningModal";
import LocationDisplay from "./LocationDisplay";
import NumberInput from "./ui/NumberInput";
import Select from "./ui/Select";
import TopBar from "./ui/TopBar";
import { useEquipment } from "../hooks/useEquipment";
import { useLocation } from "../hooks/useLocation";
import { useNavigate } from "react-router-dom";
import { usePersistentState } from "../hooks/usePersistentState";

export default function EquipmentSetup() {
  const navigate = useNavigate();
  const { location } = useLocation();
  const [showAllEquipment, setShowAllEquipment] = usePersistentState(
    "showAllEquipment",
    false
  );

  const {
    equipment,
    summary,
    loading,
    error,
    refreshEquipment,
    performAutoSetup,
    setupDevice,
    restartDevice,
    scanEquipment,
    forceUpdateDatabase,
  } = useEquipment({
    enablePolling: true,
    pollingInterval: 30000,
    includeUnknown: showAllEquipment, // Filtrage conditionnel
  });

  const [formData, setFormData] = usePersistentState("equipmentForm", {
    mount: "",
    mainCamera: "",
    mainFocalLength: 1000,
    guideCamera: "",
    guideFocalLength: 240,
  });

  const [autoSetupStarted, setAutoSetupStarted] = useState(false);
  const [setupMessage, setSetupMessage] = useState("");
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [isConnectionPopoverOpen, setIsConnectionPopoverOpen] = useState(false);

  const [status] = useState<"Connected" | "Connecting…" | "Lost">("Connected");

  const handleAutoSetup = async () => {
    if (loading || summary.isSetupInProgress) return;

    setAutoSetupStarted(true);
    setSetupMessage(
      "Recherche et configuration automatique des équipements..."
    );

    try {
      const result = await performAutoSetup();

      if (result.configured > 0) {
        setSetupMessage(
          `✅ ${result.configured} équipement(s) configuré(s) avec succès !`
        );

        // Naviguer vers l'écran de contrôle après un délai
        setTimeout(() => {
          navigate("/control");
        }, 2000);
      } else {
        setSetupMessage(
          "❌ Aucun équipement n'a pu être configuré automatiquement."
        );
      }
    } catch (error) {
      console.error("Erreur lors de la configuration automatique:", error);
      setSetupMessage("❌ Erreur lors de la configuration automatique.");
    }
  };

  const handleSetupDevice = async (deviceId: string) => {
    try {
      await setupDevice(deviceId);
      setSetupMessage(`✅ Équipement configuré avec succès !`);
    } catch (error) {
      console.error("Erreur lors de la configuration:", error);
      setSetupMessage("❌ Erreur lors de la configuration.");
    }
  };

  const handleRestartDevice = async (deviceId: string) => {
    try {
      await restartDevice(deviceId);
      setSetupMessage(`✅ Équipement redémarré avec succès !`);
    } catch (error) {
      console.error("Erreur lors du redémarrage:", error);
      setSetupMessage("❌ Erreur lors du redémarrage.");
    }
  };

  const handleScanEquipment = async () => {
    try {
      await scanEquipment();
      setSetupMessage("🔍 Scan terminé !");
    } catch (error) {
      console.error("Erreur lors du scan:", error);
      setSetupMessage("❌ Erreur lors du scan.");
    }
  };

  const handleBack = () => {
    navigate("/");
  };

  const handleComplete = () => {
    navigate("/control");
  };

  // Générer les options dynamiquement à partir des équipements détectés
  const generateOptions = (
    equipmentType: string,
    currentFieldValue?: string
  ) => {
    // Obtenir la liste des équipements déjà sélectionnés (à exclure)
    // En excluant la valeur actuelle du champ pour permettre la modification
    const selectedEquipmentIds = [
      formData.mount,
      formData.mainCamera,
      formData.guideCamera,
    ]
      .filter(Boolean)
      .filter((id) => id !== currentFieldValue);

    return equipment
      .filter((item) => item.type === equipmentType)
      .map((item) => {
        const isAlreadyUsed = selectedEquipmentIds.includes(item.id);
        return {
          value: item.id,
          label: `${item.manufacturer} ${item.model}${
            item.status !== "connected" ? ` (${item.status})` : ""
          }${isAlreadyUsed ? " (déjà utilisé)" : ""}`,
          disabled: isAlreadyUsed,
        };
      });
  };

  // Fonction de débogage pour voir quels équipements ne sont pas proposés
  const debugEquipmentFiltering = () => {
    console.log("🔍 Analyse des équipements détectés :");
    console.log("Total équipements:", equipment.length);

    const cameraEquipment = equipment.filter((item) => item.type === "camera");
    const guideCameraEquipment = equipment.filter(
      (item) => item.type === "guide-camera"
    );

    console.log("Caméras détectées:", cameraEquipment);
    console.log("Caméras de guidage détectées:", guideCameraEquipment);

    // Afficher les détails des caméras de guidage
    guideCameraEquipment.forEach((camera, index) => {
      console.log(`📷 Caméra de guidage ${index + 1}:`, {
        id: camera.id,
        name: camera.name,
        type: camera.type,
        manufacturer: camera.manufacturer,
        model: camera.model,
        status: camera.status,
        driverStatus: camera.driverStatus,
        connection: camera.connection,
        confidence: camera.confidence,
      });
    });

    const availableCameras = generateOptions("camera");
    const availableGuideCameras = generateOptions("guide-camera");

    console.log("Caméras disponibles dans la liste:", availableCameras);
    console.log(
      "Caméras de guidage disponibles dans la liste:",
      availableGuideCameras
    );

    // Expliquer le statut de chaque équipement
    guideCameraEquipment.forEach((camera, index) => {
      console.log(
        `❓ Caméra de guidage ${
          index + 1
        } incluse dans la liste: OUI (statut: ${camera.status})`
      );
      if (camera.status === "error") {
        console.log(
          `⚠️  Caméra de guidage ${
            index + 1
          } a des erreurs - sélectionnable mais peut nécessiter une résolution d'erreur`
        );
        console.log(
          `🔧 Message d'erreur: ${camera.errorMessage || "Non spécifié"}`
        );
      }
    });
  };

  // Exécuter le débogage quand les équipements changent
  useEffect(() => {
    if (equipment.length > 0) {
      debugEquipmentFiltering();
    }
  }, [equipment]);

  const mountOptions = generateOptions("mount", formData.mount);

  // Combiner les caméras principales et de guidage pour la sélection de caméra principale
  // Permettre la modification en passant la valeur actuelle
  const allCameraOptions = [
    ...generateOptions("camera", formData.mainCamera),
    ...generateOptions("guide-camera", formData.mainCamera).map((option) => ({
      ...option,
      label:
        option.label.replace(" (déjà utilisé)", "") +
        " (guidage)" +
        (option.disabled ? " (déjà utilisé)" : ""),
    })),
  ];

  const cameraOptions = allCameraOptions;
  const guideCameraOptions = generateOptions(
    "guide-camera",
    formData.guideCamera
  );

  // Tous les équipements sont désormais optionnels
  const isFormValid = true;

  const handleSubmit = () => {
    // Vérifier si des équipements sont connectés
    const hasConnectedEquipment = summary.connectedCount > 0;

    if (!hasConnectedEquipment) {
      // Ouvrir la modal d'avertissement
      setIsWarningModalOpen(true);
      return;
    }

    // Continuer normalement si des équipements sont connectés
    console.log("Equipment setup completed:", formData);
    handleComplete();
  };

  const handleContinueAnyway = () => {
    // Fermer la modal et continuer quand même
    setIsWarningModalOpen(false);
    console.log(
      "Equipment setup completed without connected equipment:",
      formData
    );
    handleComplete();
  };

  const handleStatusClick = () => {
    setIsConnectionPopoverOpen(!isConnectionPopoverOpen);
  };

  // Fonction pour gérer les changements de sélection et éviter les conflits
  const handleEquipmentSelection = (
    field: keyof typeof formData,
    value: string
  ) => {
    setFormData((prev) => {
      const newData = { ...prev };

      // Si on sélectionne un équipement déjà utilisé ailleurs, on nettoie l'autre champ
      if (value && value !== prev[field]) {
        // Vérifier et nettoyer chaque champ spécifiquement
        if (field !== "mount" && newData.mount === value) {
          newData.mount = "";
        }
        if (field !== "mainCamera" && newData.mainCamera === value) {
          newData.mainCamera = "";
        }
        if (field !== "guideCamera" && newData.guideCamera === value) {
          newData.guideCamera = "";
        }
      }

      // Mettre à jour le champ actuel
      if (field === "mount") {
        newData.mount = value;
        try {
          fetch("/api/equipment/state", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ selectedMount: value }),
          });
        } catch (err) {
          console.warn("Failed to persist mount selection", err);
        }
      } else if (field === "mainCamera") {
        newData.mainCamera = value;
      } else if (field === "guideCamera") {
        newData.guideCamera = value;
      } else if (field === "mainFocalLength") {
        newData.mainFocalLength = parseInt(value) || 0;
      } else if (field === "guideFocalLength") {
        newData.guideFocalLength = parseInt(value) || 0;
      }

      return newData;
    });
  };

  return (
    <div className="flex flex-col overflow-hidden viewport-height bg-bg-surface">
      <div className="relative">
        <TopBar
          onBack={handleBack}
          status={status}
          serialNumber="AS-2024-001"
          appVersion="v1.0.0"
          onStatusClick={handleStatusClick}
        />

        {/* Popover pour la connexion AirAstro */}
        {isConnectionPopoverOpen && (
          <div className="absolute left-0 right-0 z-50 mx-4 mt-2 border rounded-lg shadow-lg top-full bg-zinc-800 border-zinc-700">
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-white">
                  Connexion AirAstro
                </h3>
                <button
                  onClick={() => setIsConnectionPopoverOpen(false)}
                  className="text-gray-400 transition-colors hover:text-white"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <AirAstroConnectionManager />
            </div>
          </div>
        )}

        {/* Overlay pour fermer le popover */}
        {isConnectionPopoverOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setIsConnectionPopoverOpen(false)}
          />
        )}
      </div>

      <div className="flex-1 px-4 py-8 pb-20 overflow-y-auto hide-scrollbar">
        <div className="max-w-lg mx-auto">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-2xl font-semibold text-text-primary">
              Configuration de l'équipement
            </h1>
            <p className="text-text-secondary">
              Configurez votre équipement automatiquement ou manuellement
            </p>
          </div>

          {/* Location Display */}
          <div className="mb-4">
            <LocationDisplay
              location={location}
              compact={true}
              showAccuracy={false}
              className="mb-2"
            />
          </div>

          {/* Auto Setup Section */}
          <div className="relative p-4 mb-8 border rounded-lg bg-zinc-800 border-zinc-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">
                Configuration automatique
              </h2>

              {/* Boutons secondaires dans le coin supérieur droit */}
              <div className="flex gap-1">
                <button
                  onClick={handleScanEquipment}
                  disabled={loading}
                  className="p-2 text-gray-400 transition-colors rounded-md hover:text-white hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Actualiser la recherche d'équipements"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
                <button
                  onClick={async () => {
                    try {
                      await forceUpdateDatabase();
                      setSetupMessage("✅ Base de données mise à jour !");
                    } catch (error) {
                      console.error("Erreur lors de la mise à jour:", error);
                      setSetupMessage("❌ Erreur lors de la mise à jour.");
                    }
                  }}
                  disabled={loading}
                  className="p-2 text-gray-400 transition-colors rounded-md hover:text-white hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Mettre à jour la base de données d'équipements depuis GitHub"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Statistiques des équipements */}
            <div className="mb-6">
              <p className="text-sm text-gray-300">
                {summary.totalCount} équipement(s) détecté(s),{" "}
                {summary.connectedCount} connecté(s)
              </p>

              {/* Débogage - Afficher les types d'équipements détectés */}
              {equipment.length > 0 && (
                <div className="p-2 mt-2 text-xs rounded bg-zinc-900">
                  <p className="mb-1 text-gray-400">Équipements par type :</p>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(
                      equipment.reduce((acc, item) => {
                        const key = `${item.type} (${item.status})`;
                        acc[key] = (acc[key] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>)
                    ).map(([type, count]) => (
                      <span
                        key={type}
                        className="px-2 py-1 text-gray-300 rounded bg-zinc-800"
                      >
                        {type}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bouton principal de configuration automatique */}
            <button
              onClick={handleAutoSetup}
              disabled={
                loading || summary.isSetupInProgress || autoSetupStarted
              }
              className="w-full px-4 py-3 font-semibold text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {summary.isSetupInProgress || autoSetupStarted
                ? "Configuration en cours..."
                : "🚀 Configuration automatique"}
            </button>

            {/* Option pour afficher tous les équipements */}
            <div className="mt-4 mb-4 text-center">
              <button
                onClick={() => setShowAllEquipment(!showAllEquipment)}
                className="text-sm text-blue-400 underline transition-colors hover:text-blue-300"
              >
                {showAllEquipment
                  ? "Masquer les contrôleurs inconnus"
                  : "Afficher tous les équipements (y compris les contrôleurs inconnus)"}
              </button>
            </div>

            {setupMessage && (
              <div className="p-3 mb-4 rounded-md bg-zinc-900">
                <p className="text-sm text-white">{setupMessage}</p>
              </div>
            )}

            {error && (
              <div className="p-3 mb-4 bg-red-900 rounded-md">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}
          </div>

          {/* Informations sur le filtrage */}
          <EquipmentFilterInfo
            equipment={equipment}
            showAllEquipment={showAllEquipment}
            onToggleFilter={setShowAllEquipment}
          />

          {/* Detected Equipment */}
          {equipment.length > 0 && (
            <div className="mb-8">
              <h2 className="mb-4 text-lg font-semibold text-white">
                Équipements détectés
              </h2>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {equipment.map((item) => (
                  <EquipmentCard
                    key={item.id}
                    equipment={item}
                    onSetup={handleSetupDevice}
                    onRestart={handleRestartDevice}
                    isLoading={loading}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Manual Configuration */}
          <div className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-white">
              Configuration manuelle
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Row 0 – Mount */}
              <div className="sm:col-span-2">
                <Select
                  label="Monture (optionnel)"
                  options={mountOptions}
                  value={formData.mount}
                  onChange={(value) => handleEquipmentSelection("mount", value)}
                  placeholder="Sélectionner une monture"
                />
              </div>

              {/* Rows 1-2 – Cameras */}
              <Select
                label="Caméra principale (caméra ou guidage)"
                options={cameraOptions}
                value={formData.mainCamera}
                onChange={(value) =>
                  handleEquipmentSelection("mainCamera", value)
                }
                placeholder="Sélectionner une caméra"
              />

              <NumberInput
                label="Focale du télescope principal"
                suffix="mm"
                value={formData.mainFocalLength}
                defaultValue={1000}
                min={50}
                max={5000}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, mainFocalLength: value }))
                }
              />

              <Select
                label="Caméra de guidage (optionnel)"
                options={guideCameraOptions}
                value={formData.guideCamera}
                onChange={(value) =>
                  handleEquipmentSelection("guideCamera", value)
                }
                placeholder="Sélectionner une caméra"
              />

              <NumberInput
                label="Focale du télescope de guidage"
                suffix="mm"
                value={formData.guideFocalLength}
                defaultValue={240}
                min={50}
                max={1000}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, guideFocalLength: value }))
                }
              />
            </div>
          </div>

          {/* Gestionnaire de connexion AirAstro - Supprimé, maintenant dans le popover */}
        </div>
      </div>

      {/* Bottom CTA - Fixé en bas */}
      <div className="fixed bottom-0 left-0 right-0 p-4 border-t bg-bg-surface/95 backdrop-blur-sm border-zinc-700">
        <button
          onClick={handleSubmit}
          className="w-full h-11 rounded-md font-semibold shadow-elevation bg-cta-green text-white hover:bg-cta-green/90 active:scale-[.98] transition-all"
        >
          ENTRER
        </button>
      </div>

      {/* Modal d'avertissement pour les équipements non configurés */}
      <EquipmentWarningModal
        isOpen={isWarningModalOpen}
        onClose={() => setIsWarningModalOpen(false)}
        onContinue={handleContinueAnyway}
        equipmentCount={summary.totalCount}
        connectedCount={summary.connectedCount}
      />
    </div>
  );
}
