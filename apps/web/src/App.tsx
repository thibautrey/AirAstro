import { useState } from 'react';
import DeviceWelcome from './components/DeviceWelcome';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'welcome' | 'device' | 'location'>('welcome');

  const handleEnterDevice = () => {
    setCurrentScreen('device');
    // Ici vous pourriez naviguer vers l'écran principal de l'appareil
    console.log('Entering device...');
  };

  const handleLocationClick = () => {
    setCurrentScreen('location');
    // Ici vous pourriez ouvrir un modal de sélection de localisation
    console.log('Opening location selector...');
    // Pour la démo, on revient à l'écran principal après 2 secondes
    setTimeout(() => setCurrentScreen('welcome'), 2000);
  };

  if (currentScreen === 'welcome') {
    return (
      <DeviceWelcome 
        onEnterDevice={handleEnterDevice}
        onLocationClick={handleLocationClick}
      />
    );
  }

  if (currentScreen === 'location') {
    return (
      <div className="h-screen flex items-center justify-center bg-bg-surface text-text-primary">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">Sélection de localisation</h2>
          <p className="text-text-secondary">Modal de sélection de site en cours de développement...</p>
        </div>
      </div>
    );
  }

  // Écran principal de l'appareil (placeholder)
  return (
    <div className="h-screen flex items-center justify-center bg-bg-surface text-text-primary">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-4">Interface AirAstro</h2>
        <p className="text-text-secondary mb-4">Vous êtes maintenant connecté à votre appareil AirAstro</p>
        <button 
          onClick={() => setCurrentScreen('welcome')}
          className="px-4 py-2 bg-brand-red rounded text-white hover:bg-brand-red/80 transition-colors"
        >
          Retour à l'accueil
        </button>
      </div>
    </div>
  );
}
