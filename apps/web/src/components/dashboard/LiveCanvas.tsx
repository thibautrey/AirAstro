import { useEffect, useRef, useState } from "react";

export default function LiveCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasImage, setHasImage] = useState(false);

  useEffect(() => {
    // Simuler le chargement d'une image après quelques secondes
    const timer = setTimeout(() => {
      setHasImage(true);
      // Ici on pourrait dessiner une vraie image ou des données de télescope
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          // Dessiner un fond étoilé simple pour la démo
          ctx.fillStyle = "#0a0a0a";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Ajouter quelques "étoiles"
          ctx.fillStyle = "#ffffff";
          for (let i = 0; i < 100; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const size = Math.random() * 2;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="max-w-full max-h-full object-contain"
        style={{ display: hasImage ? "block" : "none" }}
      />

      {!hasImage && (
        <div className="text-center">
          <h1 className="tracking-[0.35em] text-xl text-white/5 font-light">
            AIRASTRO
          </h1>
          <p className="text-text-secondary text-sm mt-4">
            En attente de l'image en direct...
          </p>
        </div>
      )}
    </div>
  );
}
