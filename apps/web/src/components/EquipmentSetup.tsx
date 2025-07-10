import LocationDisplay from "./LocationDisplay";
import NumberInput from "./ui/NumberInput";
import Select from "./ui/Select";
import TopBar from "./ui/TopBar";
import { useLocation } from "../hooks/useLocation";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function EquipmentSetup() {
  const navigate = useNavigate();
  const { location } = useLocation();
  const [formData, setFormData] = useState({
    mount: "",
    mainCamera: "",
    mainFocalLength: 1000,
    guideCamera: "",
    guideFocalLength: 240,
  });

  const [status] = useState<"Connected" | "Connecting…" | "Lost">("Connected");

  const handleBack = () => {
    navigate("/");
  };

  const handleComplete = () => {
    // Simuler un ID d'appareil pour la démo
    const deviceId = "airastro-001";
    navigate(`/device/${deviceId}/control`);
  };

  const mountOptions = [
    { value: "eq6r", label: "Sky-Watcher EQ6-R Pro" },
    { value: "cgx", label: "Celestron CGX" },
    { value: "cgem2", label: "Celestron CGEM II" },
    { value: "heq5", label: "Sky-Watcher HEQ5 Pro" },
    { value: "azgte", label: "Celestron AZ-GTe" },
  ];

  const cameraOptions = [
    { value: "asi294mc", label: "ZWO ASI294MC Pro" },
    { value: "asi2600mc", label: "ZWO ASI2600MC Pro" },
    { value: "asi533mc", label: "ZWO ASI533MC Pro" },
    { value: "asi178mc", label: "ZWO ASI178MC" },
    { value: "asi120mc", label: "ZWO ASI120MC-S" },
    { value: "canon6d", label: "Canon EOS 6D Mark II" },
    { value: "nikond850", label: "Nikon D850" },
  ];

  const guideCameraOptions = [
    { value: "asi120mm", label: "ZWO ASI120MM-S" },
    { value: "asi178mm", label: "ZWO ASI178MM" },
    { value: "asi290mm", label: "ZWO ASI290MM Mini" },
    { value: "qhy5iii", label: "QHYCCD QHY5III-290M" },
  ];

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
              Configurez votre monture et vos caméras pour commencer
              l'observation
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
