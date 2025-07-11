import {
  AlertCircle,
  CheckCircle,
  Download,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import { UpdateInfo, UpdateStatus } from "../types/update";

import { createPortal } from "react-dom";
import { usePortal } from "../hooks/usePortal";

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: UpdateStatus;
  updateInfo: UpdateInfo | null;
  error: string | null;
  onUpdate: () => void;
  onCheck: () => void;
}

export default function UpdateModal({
  isOpen,
  onClose,
  status,
  updateInfo,
  error,
  onUpdate,
  onCheck,
}: UpdateModalProps) {
  const portal = usePortal("update-modal-portal");

  if (!isOpen || !portal) return null;

  const getStatusContent = () => {
    switch (status) {
      case UpdateStatus.CHECKING:
        return (
          <div className="py-6 text-center">
            <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-cta-green" />
            <p className="text-text-primary">
              Vérification des mises à jour...
            </p>
          </div>
        );

      case UpdateStatus.AVAILABLE:
        return (
          <div className="py-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-yellow-500" />
              <h3 className="text-lg font-semibold text-text-primary">
                Mise à jour disponible
              </h3>
            </div>

            <div className="mb-6 space-y-3">
              <div className="flex justify-between">
                <span className="text-text-secondary">Version actuelle:</span>
                <span className="font-mono text-text-primary">
                  {updateInfo?.currentVersion}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Nouvelle version:</span>
                <span className="font-mono text-cta-green">
                  {updateInfo?.latestVersion}
                </span>
              </div>
            </div>

            <div className="p-4 mb-6 border rounded-lg bg-yellow-500/10 border-yellow-500/20">
              <p className="text-sm text-yellow-200">
                ⚠️ L'installation d'une mise à jour redémarrera le serveur.
                Assurez-vous qu'aucune capture n'est en cours.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 transition-colors border rounded-lg border-zinc-600 text-text-primary hover:bg-zinc-700"
              >
                Annuler
              </button>
              <button
                onClick={onUpdate}
                className="flex items-center justify-center flex-1 gap-2 px-4 py-2 text-black transition-colors rounded-lg bg-cta-green hover:bg-cta-green/90"
              >
                <Download className="w-4 h-4" />
                Mettre à jour
              </button>
            </div>
          </div>
        );

      case UpdateStatus.DOWNLOADING:
        return (
          <div className="py-6 text-center">
            <Download className="w-8 h-8 mx-auto mb-4 animate-pulse text-cta-green" />
            <p className="text-text-primary">
              Téléchargement de la mise à jour...
            </p>
          </div>
        );

      case UpdateStatus.INSTALLING:
        return (
          <div className="py-6 text-center">
            <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-cta-green" />
            <p className="text-text-primary">Installation en cours...</p>
            <p className="mt-2 text-sm text-text-secondary">
              Le serveur va redémarrer automatiquement
            </p>
          </div>
        );

      case UpdateStatus.COMPLETED:
        return (
          <div className="py-6 text-center">
            <CheckCircle className="w-8 h-8 mx-auto mb-4 text-cta-green" />
            <p className="text-text-primary">
              Mise à jour installée avec succès!
            </p>
            <p className="mt-2 text-sm text-text-secondary">
              Le serveur va redémarrer dans quelques instants
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 mt-4 text-black transition-colors rounded-lg bg-cta-green hover:bg-cta-green/90"
            >
              Fermer
            </button>
          </div>
        );

      case UpdateStatus.ERROR:
        return (
          <div className="py-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-500" />
              <h3 className="text-lg font-semibold text-text-primary">
                Erreur
              </h3>
            </div>

            <div className="p-4 mb-6 border rounded-lg bg-red-500/10 border-red-500/20">
              <p className="text-sm text-red-200">{error}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 transition-colors border rounded-lg border-zinc-600 text-text-primary hover:bg-zinc-700"
              >
                Fermer
              </button>
              <button
                onClick={onCheck}
                className="flex items-center justify-center flex-1 gap-2 px-4 py-2 text-black transition-colors rounded-lg bg-cta-green hover:bg-cta-green/90"
              >
                <RefreshCw className="w-4 h-4" />
                Réessayer
              </button>
            </div>
          </div>
        );

      default:
        return (
          <div className="py-4">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-6 h-6 text-cta-green" />
              <h3 className="text-lg font-semibold text-text-primary">
                Système à jour
              </h3>
            </div>

            <p className="mb-6 text-text-secondary">
              Aucune mise à jour disponible. Votre système est à la dernière
              version.
            </p>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 transition-colors border rounded-lg border-zinc-600 text-text-primary hover:bg-zinc-700"
              >
                Fermer
              </button>
              <button
                onClick={onCheck}
                className="flex items-center justify-center flex-1 gap-2 px-4 py-2 text-black transition-colors rounded-lg bg-cta-green hover:bg-cta-green/90"
              >
                <RefreshCw className="w-4 h-4" />
                Vérifier à nouveau
              </button>
            </div>
          </div>
        );
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center min-h-screen p-4 bg-black/70 backdrop-blur-sm z-modal-pwa"
      style={{ zIndex: 99999 }}
    >
      <div className="w-full max-w-md mx-auto my-auto border shadow-2xl bg-bg-surface border-zinc-700 rounded-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-700">
          <h2 className="text-xl font-semibold text-text-primary">
            Mise à jour système
          </h2>
          <button
            onClick={onClose}
            className="p-1 transition-colors rounded hover:bg-white/10"
            disabled={
              status === UpdateStatus.DOWNLOADING ||
              status === UpdateStatus.INSTALLING
            }
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">{getStatusContent()}</div>
      </div>
    </div>,
    portal
  );
}
