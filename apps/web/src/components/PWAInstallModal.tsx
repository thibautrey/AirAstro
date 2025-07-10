import { Plus, Share, X } from "lucide-react";
import { useEffect, useState } from "react";

interface PWAInstallModalProps {
  onClose: () => void;
}

export default function PWAInstallModal({ onClose }: PWAInstallModalProps) {
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));
  }, []);

  const handleInstall = () => {
    // This will be handled by the PWA install prompt for Android
    // For iOS, we show instructions
    onClose();
  };

  return (
    <div className="pwa-install-modal">
      <div className="pwa-install-content relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X size={20} />
        </button>

        <div className="pwa-install-icon">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>

        <h2 className="text-xl font-semibold text-white mb-2">
          Installer AirAstro
        </h2>

        <p className="text-gray-300 text-sm mb-4">
          Pour une meilleure expérience, installez AirAstro sur votre écran
          d'accueil
        </p>

        {isIOS && (
          <div className="pwa-install-steps">
            <div className="pwa-install-step">
              1. Appuyez sur <Share size={16} className="inline mx-1" /> dans la
              barre Safari
            </div>
            <div className="pwa-install-step">
              2. Sélectionnez "Sur l'écran d'accueil"
            </div>
            <div className="pwa-install-step">3. Appuyez sur "Ajouter"</div>
          </div>
        )}

        {isAndroid && (
          <div className="pwa-install-steps">
            <div className="pwa-install-step">
              1. Appuyez sur le menu ⋮ du navigateur
            </div>
            <div className="pwa-install-step">
              2. Sélectionnez "Ajouter à l'écran d'accueil"
            </div>
            <div className="pwa-install-step">3. Confirmez l'installation</div>
          </div>
        )}

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-800"
          >
            Plus tard
          </button>
          <button
            onClick={handleInstall}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600"
          >
            Compris
          </button>
        </div>
      </div>
    </div>
  );
}
