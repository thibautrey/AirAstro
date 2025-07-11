# État des fonctionnalités AirAstro

## Fonctionnalités implémentées ✅

### Dashboard principal

- **LiveCanvas** : Affichage du canvas principal avec message d'attente
- **CameraRail** : Contrôles de caméra fonctionnels (sélection, paramètres, capture)
- **TopBarDashboard** : Barre supérieure avec statut de base
- **UpdateModal** : Système de mise à jour

### Connexion et configuration

- **DeviceWelcome** : Page d'accueil avec connexion aux dispositifs
- **LocationSelector** : Sélection de la localisation
- **EquipmentSetup** : Configuration de l'équipement

## Fonctionnalités non implémentées ❌

### Modes de guidage (ModeRail)

- **Hist** : Histogramme - Non implémenté
- **Guide** : Guidage automatique - Non implémenté
- **Solve** : Résolution astrométrique - Non implémenté
- **Detect** : Détection d'objets - Non implémenté
- **Annotate** : Annotation d'image - Non implémenté
- **Cross** : Réticule - Non implémenté

### Barre d'outils supérieure (TopBarDashboard)

- **Photo** : Gestion des photos - Non implémenté
- **Histogram** : Histogramme en temps réel - Non implémenté
- **EFW** : Roue à filtres électronique - Non implémenté
- **EAF** : Mise au point automatique - Non implémenté
- **CAA** : Correction atmosphérique - Non implémenté
- **Info** : Informations détaillées - Non implémenté

### Barre d'histogramme (HistogramBar)

- **Plate solving** : Résolution des coordonnées - Non implémenté
- **Contrôles Stretch** : Ajustement de l'étirement - Non implémenté
- **Boutons Auto/Zoom** : Fonctionnalités automatiques - Non implémenté
- **Statistiques** : Actuellement simulées

### Overlay de guidage (GuidingOverlay)

- **Données de guidage** : Actuellement simulées
- **Connexion PHD2** : Non implémenté
- **Contrôles de guidage** : Non implémenté

## Indicateurs visuels

### Éléments non implémentés

- **Opacité réduite** (30%) pour indiquer l'indisponibilité
- **Curseur "not-allowed"** pour les interactions
- **Point rouge** en haut à droite pour les fonctionnalités manquantes
- **Boutons désactivés** avec styles appropriés

### Données simulées

- **Badge "Simulé"** pour les données de test
- **Badge "Données simulées"** pour les statistiques
- **Couleur jaune** pour indiquer le statut temporaire

## Priorités de développement

1. **Système de guidage** : Connexion PHD2 et contrôles
2. **Histogramme en temps réel** : Analyse des images
3. **Plate solving** : Résolution astrométrique
4. **Gestion des filtres** : Support EFW
5. **Mise au point automatique** : Support EAF

## Notes techniques

- Les styles CSS pour les éléments non implémentés sont définis dans `index.css`
- Les composants utilisent des props `implemented` pour contrôler l'état
- Les données simulées sont clairement marquées pour éviter la confusion
