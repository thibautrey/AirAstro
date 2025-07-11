import {
  Camera,
  Crosshair,
  HardDrive,
  Info,
  Telescope,
  Wifi,
  X,
} from "lucide-react";

import { clsx } from "clsx";
import { createPortal } from "react-dom";
import { usePortal } from "../hooks/usePortal";
import { useState } from "react";

interface EquipmentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

type EquipmentType =
  | "Connection"
  | "MainCamera"
  | "PolarAlign"
  | "GuidingScope"
  | "FilterWheel"
  | "Focuser"
  | "Rotator"
  | "Storage"
  | "About";

const equipmentTypes: Array<{
  key: EquipmentType;
  icon: React.ElementType;
  label: string;
  active?: boolean;
}> = [
  { key: "Connection", icon: Wifi, label: "Connection" },
  { key: "MainCamera", icon: Camera, label: "Main Camera", active: true },
  { key: "PolarAlign", icon: Crosshair, label: "Polar Align" },
  { key: "GuidingScope", icon: Telescope, label: "Guiding Scope" },
  {
    key: "FilterWheel",
    icon: () => <span className="text-xs font-bold">EFW</span>,
    label: "Filter Wheel",
  },
  {
    key: "Focuser",
    icon: () => <span className="text-xs font-bold">EAF</span>,
    label: "Focuser",
  },
  {
    key: "Rotator",
    icon: () => <span className="text-xs font-bold">CAA</span>,
    label: "Rotator",
  },
  { key: "Storage", icon: HardDrive, label: "Storage" },
  { key: "About", icon: Info, label: "About" },
];

export default function EquipmentDrawer({
  isOpen,
  onClose,
}: EquipmentDrawerProps) {
  const [activeEquipment, setActiveEquipment] =
    useState<EquipmentType>("MainCamera");
  const portal = usePortal("equipment-drawer-portal");

  const handleEquipmentSelect = (equipment: EquipmentType) => {
    setActiveEquipment(equipment);
  };

  if (!portal) return null;

  return createPortal(
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[999999] bg-black/50"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <aside
        className={clsx(
          "fixed right-0 top-0 h-screen w-[min(420px,80vw)] flex bg-black/80 backdrop-blur-sm z-[999999] transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Icon Rail */}
        <div className="flex flex-col border-r w-14 bg-black/80 backdrop-blur-sm border-zinc-900">
          {/* Close button */}
          <button
            onClick={onClose}
            className="flex items-center justify-center w-10 h-10 mx-3 my-2 transition-colors rounded-md text-white/70 hover:text-white"
          >
            <X size={20} />
          </button>

          {/* Equipment icons - scrollable */}
          <div className="flex flex-col flex-1 overflow-y-auto hide-scrollbar">
            {equipmentTypes.slice(0, -1).map((equipment) => {
              const Icon = equipment.icon;
              const isActive = activeEquipment === equipment.key;

              return (
                <button
                  key={equipment.key}
                  onClick={() => handleEquipmentSelect(equipment.key)}
                  className={clsx(
                    "w-10 h-10 mx-3 my-2 flex items-center justify-center rounded-md transition-all duration-100",
                    isActive
                      ? "bg-cta-green/25 text-cta-green scale-105"
                      : "text-white/70 hover:text-white"
                  )}
                  aria-label={equipment.label}
                >
                  <Icon size={20} />
                </button>
              );
            })}
          </div>

          {/* About button at bottom */}
          <div className="mt-auto mb-4">
            <button
              onClick={() => handleEquipmentSelect("About")}
              className={clsx(
                "w-10 h-10 mx-3 my-2 flex items-center justify-center rounded-md transition-all duration-100",
                activeEquipment === "About"
                  ? "bg-cta-green/25 text-cta-green scale-105"
                  : "text-white/70 hover:text-white"
              )}
              aria-label="About"
            >
              <Info size={20} />
            </button>
          </div>
        </div>

        {/* Content Pane */}
        <div className="flex flex-col flex-1">
          {/* Title */}
          <div className="pt-4 pb-2 text-center">
            <h2 className="text-base font-semibold text-text-primary">
              {equipmentTypes.find((e) => e.key === activeEquipment)?.label}
            </h2>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 px-4 pb-24 overflow-y-auto hide-scrollbar">
            {activeEquipment === "MainCamera" && <MainCameraContent />}
            {activeEquipment === "Connection" && <ConnectionContent />}
            {activeEquipment === "PolarAlign" && <PolarAlignContent />}
            {activeEquipment === "GuidingScope" && <GuidingScopeContent />}
            {activeEquipment === "FilterWheel" && <FilterWheelContent />}
            {activeEquipment === "Focuser" && <FocuserContent />}
            {activeEquipment === "Rotator" && <RotatorContent />}
            {activeEquipment === "Storage" && <StorageContent />}
            {activeEquipment === "About" && <AboutContent />}
          </div>
        </div>
      </aside>
    </>,
    portal
  );
}

// Placeholder components for different equipment types
function MainCameraContent() {
  return (
    <div className="space-y-6">
      {/* Camera Selector */}
      <fieldset className="bg-zinc-800/50 rounded-md px-4 py-3 space-y-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
        <select className="w-full px-3 text-sm rounded-md h-9 bg-zinc-700 text-text-primary">
          <option value="">Aucune caméra sélectionnée</option>
        </select>
        <div className="flex items-center justify-between">
          <button className="flex items-center justify-center w-8 h-8 rounded bg-zinc-700/60 hover:bg-zinc-600 text-text-secondary">
            ↻
          </button>
          <div className="relative h-4 rounded-full w-14 bg-zinc-700">
            <div className="w-3 h-3 bg-white rounded-full absolute top-0.5 left-0.5"></div>
          </div>
        </div>
      </fieldset>

      {/* Gain */}
      <div className="space-y-2">
        <label className="text-sm text-text-secondary">Gain</label>
        <div className="flex gap-2">
          <div className="flex bg-zinc-700 rounded-md p-0.5">
            <button className="px-3 py-1 text-sm text-white rounded bg-zinc-600">
              L
            </button>
            <button className="px-3 py-1 text-sm text-text-secondary">H</button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="range"
            className="flex-1 h-4 rounded-full appearance-none bg-zinc-700 slider"
            min="0"
            max="100"
            defaultValue="50"
          />
          <div className="flex items-center justify-center w-12 text-xs rounded h-7 bg-zinc-700 text-text-secondary">
            N/A
          </div>
        </div>
      </div>

      {/* Focal Length */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium tracking-wide text-text-secondary">
          FOCAL LENGTH
        </h3>
        <div className="flex items-center px-3 rounded-md bg-zinc-800/50 h-11">
          <span className="flex-1 text-sm text-text-secondary">
            Main Scope Focal Length
          </span>
          <span className="text-xs text-text-secondary">?</span>
          <div className="flex items-center justify-center w-12 ml-2 text-xs rounded h-7 bg-zinc-700 text-text-secondary">
            mm
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <div className="bg-zinc-800/50 rounded-md shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
        <button className="flex items-center justify-between w-full h-12 px-4 text-sm text-white/90 hover:bg-zinc-700/60 rounded-t-md">
          <span>Customize File Name</span>
          <span>›</span>
        </button>
        <div className="h-px mx-4 bg-zinc-700/60"></div>
        <button className="flex items-center justify-between w-full h-12 px-4 text-sm text-white/90 hover:bg-zinc-700/60 rounded-b-md">
          <span>Advanced Settings</span>
          <span>›</span>
        </button>
      </div>
    </div>
  );
}

function ConnectionContent() {
  return (
    <div className="space-y-4">
      <div className="text-text-secondary">
        <p>Informations de connexion réseau</p>
      </div>
    </div>
  );
}

function PolarAlignContent() {
  return (
    <div className="space-y-4">
      <div className="text-text-secondary">
        <p>Configuration d'alignement polaire</p>
      </div>
    </div>
  );
}

function GuidingScopeContent() {
  return (
    <div className="space-y-4">
      <div className="text-text-secondary">
        <p>Configuration du télescope de guidage</p>
      </div>
    </div>
  );
}

function FilterWheelContent() {
  return (
    <div className="space-y-4">
      <div className="text-text-secondary">
        <p>Configuration de la roue à filtres</p>
      </div>
    </div>
  );
}

function FocuserContent() {
  return (
    <div className="space-y-4">
      <div className="text-text-secondary">
        <p>Configuration du focaliseur</p>
      </div>
    </div>
  );
}

function RotatorContent() {
  return (
    <div className="space-y-4">
      <div className="text-text-secondary">
        <p>Configuration du rotateur</p>
      </div>
    </div>
  );
}

function StorageContent() {
  return (
    <div className="space-y-4">
      <div className="text-text-secondary">
        <p>Gestion du stockage</p>
      </div>
    </div>
  );
}

function AboutContent() {
  return (
    <div className="space-y-4">
      <div className="text-text-secondary">
        <p>Informations sur l'appareil</p>
      </div>
    </div>
  );
}
