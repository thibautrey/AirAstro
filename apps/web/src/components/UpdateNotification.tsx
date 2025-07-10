import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";

import { UpdateStatus } from "../types/update";

interface UpdateNotificationProps {
  status: UpdateStatus;
  latestVersion?: string;
  onUpdate: () => void;
  onDismiss: () => void;
}

export default function UpdateNotification({
  status,
  latestVersion,
  onUpdate,
  onDismiss,
}: UpdateNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(status === UpdateStatus.AVAILABLE);
  }, [status]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-16 right-4 z-notification animate-in slide-in-from-right">
      <div className="bg-bg-surface border border-yellow-500/30 rounded-lg shadow-lg p-4 max-w-sm">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <Download className="w-5 h-5 text-yellow-400 mt-0.5" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-text-primary">
              Mise à jour disponible
            </h3>
            <p className="text-xs text-text-secondary mt-1">
              Version {latestVersion} disponible
            </p>

            <div className="flex gap-2 mt-3">
              <button
                onClick={onUpdate}
                className="px-3 py-1 text-xs bg-cta-green text-black rounded hover:bg-cta-green/90 transition-colors"
              >
                Mettre à jour
              </button>
              <button
                onClick={onDismiss}
                className="px-3 py-1 text-xs border border-zinc-600 text-text-secondary rounded hover:bg-zinc-700 transition-colors"
              >
                Plus tard
              </button>
            </div>
          </div>

          <button
            onClick={onDismiss}
            className="flex-shrink-0 p-0.5 hover:bg-white/10 rounded transition-colors"
          >
            <X className="w-4 h-4 text-text-secondary" />
          </button>
        </div>
      </div>
    </div>
  );
}
