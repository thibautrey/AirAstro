import {
  AlertCircle,
  CheckCircle,
  Download,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import { UpdateInfo, UpdateStatus } from "../types/update";

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
  if (!isOpen) return null;

  const getStatusContent = () => {
    switch (status) {
      case UpdateStatus.CHECKING:
        return (
          <div className="text-center py-6">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-cta-green" />
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

            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-text-secondary">Version actuelle:</span>
                <span className="text-text-primary font-mono">
                  {updateInfo?.currentVersion}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Nouvelle version:</span>
                <span className="text-cta-green font-mono">
                  {updateInfo?.latestVersion}
                </span>
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-200">
                ⚠️ L'installation d'une mise à jour redémarrera le serveur.
                Assurez-vous qu'aucune capture n'est en cours.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-zinc-600 text-text-primary rounded-lg hover:bg-zinc-700 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={onUpdate}
                className="flex-1 px-4 py-2 bg-cta-green text-black rounded-lg hover:bg-cta-green/90 transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Mettre à jour
              </button>
            </div>
          </div>
        );

      case UpdateStatus.DOWNLOADING:
        return (
          <div className="text-center py-6">
            <Download className="w-8 h-8 animate-pulse mx-auto mb-4 text-cta-green" />
            <p className="text-text-primary">
              Téléchargement de la mise à jour...
            </p>
          </div>
        );

      case UpdateStatus.INSTALLING:
        return (
          <div className="text-center py-6">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-cta-green" />
            <p className="text-text-primary">Installation en cours...</p>
            <p className="text-sm text-text-secondary mt-2">
              Le serveur va redémarrer automatiquement
            </p>
          </div>
        );

      case UpdateStatus.COMPLETED:
        return (
          <div className="text-center py-6">
            <CheckCircle className="w-8 h-8 mx-auto mb-4 text-cta-green" />
            <p className="text-text-primary">
              Mise à jour installée avec succès!
            </p>
            <p className="text-sm text-text-secondary mt-2">
              Le serveur va redémarrer dans quelques instants
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-cta-green text-black rounded-lg hover:bg-cta-green/90 transition-colors"
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

            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-200">{error}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-zinc-600 text-text-primary rounded-lg hover:bg-zinc-700 transition-colors"
              >
                Fermer
              </button>
              <button
                onClick={onCheck}
                className="flex-1 px-4 py-2 bg-cta-green text-black rounded-lg hover:bg-cta-green/90 transition-colors flex items-center justify-center gap-2"
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

            <p className="text-text-secondary mb-6">
              Aucune mise à jour disponible. Votre système est à la dernière
              version.
            </p>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-zinc-600 text-text-primary rounded-lg hover:bg-zinc-700 transition-colors"
              >
                Fermer
              </button>
              <button
                onClick={onCheck}
                className="flex-1 px-4 py-2 bg-cta-green text-black rounded-lg hover:bg-cta-green/90 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Vérifier à nouveau
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-bg-surface border border-zinc-700 rounded-xl max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-700">
          <h2 className="text-xl font-semibold text-text-primary">
            Mise à jour système
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded transition-colors"
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
    </div>
  );
}
