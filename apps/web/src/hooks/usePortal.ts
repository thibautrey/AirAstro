import { useEffect, useRef } from "react";

export function usePortal(id: string = "portal-root") {
  const portalRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Chercher un conteneur existant ou en créer un nouveau
    let portal = document.getElementById(id);

    if (!portal) {
      portal = document.createElement("div");
      portal.id = id;
      portal.style.position = "relative";
      portal.style.zIndex = "99999";
      document.body.appendChild(portal);
    }

    portalRef.current = portal;

    // Nettoyage : supprimer le portail s'il est vide quand le composant se démonte
    return () => {
      if (portal && portal.children.length === 0) {
        document.body.removeChild(portal);
      }
    };
  }, [id]);

  return portalRef.current;
}
