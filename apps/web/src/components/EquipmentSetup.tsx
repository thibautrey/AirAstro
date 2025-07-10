import { useEffect, useState } from "react";

import AirAstroConnectionManager from "./AirAstroConnectionManager";
import EquipmentCard from "./EquipmentCard";
import LocationDisplay from "./LocationDisplay";
import NumberInput from "./ui/NumberInput";
import Select from "./ui/Select";
import TopBar from "./ui/TopBar";
import { useEquipment } from "../hooks/useEquipment";
import { useLocation } from "../hooks/useLocation";
import { useNavigate } from "react-router-dom";

export default function EquipmentSetup() {
  const navigate = useNavigate();
  const { location } = useLocation();
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
  } = useEquipment({ enablePolling: true, pollingInterval: 30000 }); // Polling activé sur cette page

  const [formData, setFormData] = useState({
    mount: "",
    mainCamera: "",
    mainFocalLength: 1000,
    guideCamera: "",
    guideFocalLength: 240,
  });

  const [autoSetupStarted, setAutoSetupStarted] = useState(false);
  const [setupMessage, setSetupMessage] = useState("");

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
          const deviceId = "airastro-001";
          navigate(`/device/${deviceId}/control`);
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
    // Simuler un ID d'appareil pour la démo
    const deviceId = "airastro-001";
    navigate(`/device/${deviceId}/control`);
  };

  // Générer les options dynamiquement à partir des équipements détectés
  const generateOptions = (equipmentType: string) => {
    return equipment
      .filter(
        (item) => item.type === equipmentType && item.status === "connected"
      )
      .map((item) => ({
        value: item.id,
        label: `${item.manufacturer} ${item.model}`,
      }));
  };

  const mountOptions = generateOptions("mount");
  const cameraOptions = generateOptions("camera");
  const guideCameraOptions = generateOptions("guide-camera");

  // Tous les équipements sont désormais optionnels
  const isFormValid = true;

  const handleSubmit = () => {
    console.log("Equipment setup completed:", formData);
    handleComplete();
  };

  return (
    <div className="viewport-height bg-bg-surface overflow-hidden flex flex-col">
      <TopBar
        onBack={handleBack}
        status={status}
        serialNumber="AS-2024-001"
        appVersion="v1.0.0"
      />

      <div className="flex-1 overflow-y-auto px-4 py-8 pb-20">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-text-primary mb-2">
              Configuration de l'équipement
            </h1>
            <p className="text-text-secondary">
              Configurez votre équipement automatiquement ou manuellement
            </p>
          </div>

          {/* Location Display */}
          <div className="mb-6">
            <LocationDisplay
              location={location}
              showAccuracy={true}
              className="mb-4"
            />
          </div>

          {/* Auto Setup Section */}
          <div className="mb-8 p-4 bg-zinc-800 rounded-lg border border-zinc-700">
            <h2 className="text-lg font-semibold text-white mb-4">
              Configuration automatique
            </h2>

            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-300">
                  {summary.totalCount} équipement(s) détecté(s)
                </p>
                <p className="text-sm text-gray-300">
                  {summary.connectedCount} connecté(s)
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleScanEquipment}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-sm"
                >
                  {loading ? "Scan..." : "Scanner"}
                </button>
                <button
                  onClick={handleAutoSetup}
                  disabled={
                    loading || summary.isSetupInProgress || autoSetupStarted
                  }
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-sm"
                >
                  {summary.isSetupInProgress || autoSetupStarted
                    ? "Configuration..."
                    : "Auto Config"}
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
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-sm"
                  title="Met à jour la base de données d'équipements depuis GitHub"
                >
                  {loading ? "MAJ..." : "MAJ DB"}
                </button>
              </div>
            </div>

            {setupMessage && (
              <div className="mb-4 p-3 bg-zinc-900 rounded-md">
                <p className="text-sm text-white">{setupMessage}</p>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-900 rounded-md">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}
          </div>

          {/* Detected Equipment */}
          {equipment.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-white mb-4">
                Équipements détectés
              </h2>
              <div className="space-y-4">
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
            <h2 className="text-lg font-semibold text-white mb-4">
              Configuration manuelle
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Row 0 – Mount */}
              <div className="sm:col-span-2">
                <Select
                  label="Monture (optionnel)"
                  options={mountOptions}
                  value={formData.mount}
                  onChange={(value) =>
                    setFormData((prev) => ({ ...prev, mount: value }))
                  }
                  placeholder="Sélectionner une monture"
                />
              </div>

              {/* Rows 1-2 – Cameras */}
              <Select
                label="Caméra principale (optionnel)"
                options={cameraOptions}
                value={formData.mainCamera}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, mainCamera: value }))
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
                  setFormData((prev) => ({ ...prev, guideCamera: value }))
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

          {/* Gestionnaire de connexion AirAstro */}
          <AirAstroConnectionManager />
        </div>
      </div>

      {/* Bottom CTA - Fixé en bas */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-bg-surface/95 backdrop-blur-sm border-t border-zinc-700">
        <button
          onClick={handleSubmit}
          className="w-full h-11 rounded-md font-semibold shadow-elevation bg-cta-green text-white hover:bg-cta-green/90 active:scale-[.98] transition-all"
        >
          ENTRER
        </button>
      </div>
    </div>
  );
}
