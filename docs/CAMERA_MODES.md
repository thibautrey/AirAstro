# Configuration des Modes d'Exposition

## Types d'Exposition

### 1. Mode Light Frame (Lumière)

- **Usage** : Capture principale des objets célestes
- **Durée** : 30 secondes à 20 minutes selon l'objet
- **Gain** : 50-80% pour caméras refroidies, 20-40% pour DSLR
- **Binning** : 1×1 pour résolution maximale
- **Température** : -10°C à -20°C si refroidissement disponible

### 2. Mode Dark Frame (Noir)

- **Usage** : Calibration du bruit électronique
- **Durée** : Identique aux light frames
- **Gain** : Identique aux light frames
- **Binning** : Identique aux light frames
- **Température** : Identique aux light frames
- **Spécificité** : Obturateur fermé ou caméra couverte

### 3. Mode Flat Frame (Plat)

- **Usage** : Calibration du vignettage et des poussières
- **Durée** : 0.1 à 5 secondes selon l'éclairage
- **Gain** : Identique aux light frames
- **Binning** : Identique aux light frames
- **Éclairage** : Panneau plat ou ciel crépusculaire uniforme

### 4. Mode Bias Frame (Biais)

- **Usage** : Calibration du bruit de lecture
- **Durée** : Exposition la plus courte possible (< 1ms)
- **Gain** : Identique aux light frames
- **Binning** : Identique aux light frames
- **Température** : Identique aux light frames

## Paramètres Recommandés par Type d'Objet

### Nébuleuses

- **Exposition** : 5-15 minutes
- **Gain** : 60-80%
- **Binning** : 1×1
- **Filtres** : Ha, OIII, SII pour narrowband

### Galaxies

- **Exposition** : 10-20 minutes
- **Gain** : 50-70%
- **Binning** : 1×1
- **Filtres** : L, R, G, B ou sans filtre

### Amas d'Étoiles

- **Exposition** : 2-10 minutes
- **Gain** : 40-60%
- **Binning** : 1×1 ou 2×2
- **Filtres** : RGB ou sans filtre

### Planètes

- **Exposition** : 1/30 à 1/10 seconde
- **Gain** : 80-100%
- **Binning** : 1×1
- **Mode** : Vidéo haute fréquence (ROI)

## Formats de Fichier

### FITS (Recommandé pour l'astronomie)

- **Avantages** : Métadonnées complètes, précision 16-bit
- **Usage** : Astrophotographie scientifique
- **Taille** : ~25MB pour 4096×4096 pixels

### TIFF (Alternative)

- **Avantages** : Compatible avec la plupart des logiciels
- **Usage** : Traitement avec des logiciels photo généralistes
- **Taille** : ~25MB pour 4096×4096 pixels

### RAW (DSLR uniquement)

- **Avantages** : Format natif de l'appareil photo
- **Usage** : Appareils photo Canon/Nikon
- **Taille** : Variable selon l'appareil

## Binning (Regroupement de Pixels)

### 1×1 (Pas de binning)

- **Résolution** : Maximale
- **Sensibilité** : Normale
- **Usage** : Objets lumineux, résolution critique

### 2×2 (Binning 2×2)

- **Résolution** : Divisée par 2
- **Sensibilité** : Multipliée par 4
- **Usage** : Objets faibles, gain de vitesse

### 3×3 et 4×4

- **Usage** : Très rares, pour objets très faibles
- **Compromis** : Résolution très réduite

## Refroidissement

### Température Cible

- **Été** : -15°C à -20°C
- **Hiver** : -10°C à -15°C
- **Règle** : 15-20°C en dessous de la température ambiante

### Gestion de la Condensation

- **Réchauffement graduel** : 2-3°C par minute
- **Surveillance** : Capteur de point de rosée
- **Protection** : Pare-buée si nécessaire

## Région d'Intérêt (ROI)

### Usage

- **Planètes** : Cadrage serré pour réduire la taille des fichiers
- **Guidage** : Étoile guide unique
- **Test** : Vérification rapide des paramètres

### Configuration

- **Position** : Centré sur l'objet
- **Taille** : Multiple de 4 pixels (optimisation)
- **Aspect** : Conserver les proportions si possible
