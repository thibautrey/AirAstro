import { useEffect, useState } from "react";

export interface PWAInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function usePWAInstall() {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [installPrompt, setInstallPrompt] =
    useState<PWAInstallPromptEvent | null>(null);

  useEffect(() => {
    // Check if app is already installed as PWA
    const checkIfInstalled = () => {
      // Method 1: Check display mode
      const isStandalone = window.matchMedia(
        "(display-mode: standalone)"
      ).matches;

      // Method 2: Check if running in native app context (iOS)
      const isIOSStandalone = (window.navigator as any).standalone === true;

      // Method 3: Check user agent for WebView indicators
      const userAgent = navigator.userAgent.toLowerCase();
      const isWebView =
        /wv/.test(userAgent) || /version.*chrome/.test(userAgent);

      return isStandalone || isIOSStandalone || isWebView;
    };

    setIsInstalled(checkIfInstalled());

    // Listen for PWA install prompt (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as PWAInstallPromptEvent);
      setIsInstallable(true);
    };

    // Listen for successful PWA installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const triggerInstall = async () => {
    if (!installPrompt) return false;

    try {
      await installPrompt.prompt();
      const result = await installPrompt.userChoice;

      if (result.outcome === "accepted") {
        setIsInstalled(true);
        setIsInstallable(false);
        setInstallPrompt(null);
        return true;
      }
    } catch (error) {
      console.error("Error triggering PWA install:", error);
    }

    return false;
  };

  const canShowInstallPrompt = () => {
    // Show prompt if:
    // 1. Not already installed
    // 2. And either installable (Android) or on iOS Safari
    const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
    const isInSafari =
      /safari/.test(navigator.userAgent.toLowerCase()) &&
      !/chrome/.test(navigator.userAgent.toLowerCase());

    return !isInstalled && (isInstallable || (isIOS && isInSafari));
  };

  return {
    isInstalled,
    isInstallable,
    canShowInstallPrompt: canShowInstallPrompt(),
    triggerInstall,
  };
}
