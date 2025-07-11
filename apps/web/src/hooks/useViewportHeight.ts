import { useEffect, useState } from "react";

/**
 * Hook pour gérer correctement la hauteur et largeur de viewport sur Mobile Safari
 * Basé sur les recommandations pour gérer la différence entre Safari mobile
 * et le mode standalone (PWA)
 */
export function useViewportHeight() {
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Détecter si on est en mode standalone (PWA) ou en Safari mobile
    const standalone =
      (navigator as any).standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches;

    setIsStandalone(standalone);

    const updateDimensions = () => {
      // Utiliser window.innerHeight comme recommandé dans le forum
      const height = window.innerHeight;
      const width = window.innerWidth;
      setViewportHeight(height);
      setViewportWidth(width);

      // Mettre à jour une propriété CSS personnalisée pour un accès global
      document.documentElement.style.setProperty(
        "--viewport-height",
        `${height}px`
      );
      document.documentElement.style.setProperty(
        "--viewport-width",
        `${width}px`
      );

      // Calculer la hauteur ajustée selon le mode
      const adjustedHeight = standalone ? height : height - 32; // 32px pour la barre d'URL Safari
      document.documentElement.style.setProperty(
        "--adjusted-viewport-height",
        `${adjustedHeight}px`
      );
    };

    // Mise à jour initiale
    updateDimensions();

    // Écouter les changements de taille de viewport
    window.addEventListener("resize", updateDimensions);
    window.addEventListener("orientationchange", updateDimensions);

    // Écouter les changements spécifiques à iOS (clavier virtuel, etc.)
    const handleVisualViewportChange = () => {
      if (window.visualViewport) {
        const height = window.visualViewport.height;
        const width = window.visualViewport.width;
        document.documentElement.style.setProperty(
          "--visual-viewport-height",
          `${height}px`
        );
        document.documentElement.style.setProperty(
          "--visual-viewport-width",
          `${width}px`
        );
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener(
        "resize",
        handleVisualViewportChange
      );
      handleVisualViewportChange();
    }

    return () => {
      window.removeEventListener("resize", updateDimensions);
      window.removeEventListener("orientationchange", updateDimensions);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener(
          "resize",
          handleVisualViewportChange
        );
      }
    };
  }, []);

  return {
    viewportHeight,
    viewportWidth,
    isStandalone,
    // Fonction utilitaire pour obtenir la hauteur CSS
    getHeightStyle: () => ({
      height: `${viewportHeight}px`,
    }),
    // Fonction utilitaire pour obtenir la largeur CSS
    getWidthStyle: () => ({
      width: `${viewportWidth}px`,
    }),
    // Fonction utilitaire pour obtenir la hauteur ajustée (pour le contenu)
    getAdjustedHeightStyle: () => ({
      height: `${isStandalone ? viewportHeight : viewportHeight - 32}px`,
    }),
    // Fonction utilitaire pour obtenir les dimensions complètes
    getDimensionsStyle: () => ({
      height: `${viewportHeight}px`,
      width: `${viewportWidth}px`,
    }),
  };
}
