# Guide d'Utilisation de l'Interface de Prise de Vue

## Interface Principal

### Rail de Caméra (CameraRail)
Le rail de caméra est situé à droite de l'écran et contient tous les contrôles de capture.

#### Indicateurs d'État
- **Voyant de Connexion** : Vert = caméra connectée, Rouge = déconnectée
- **Température** : Affichage en temps réel (si refroidissement disponible)
- **Temps Restant** : Compte à rebours pendant l'exposition

#### Boutons de Contrôle

##### Bouton Principal (Déclencheur)
- **État Normal** : Cercle gris, clic pour démarrer l'exposition
- **État Exposition** : Barre de progression circulaire bleue
- **Annulation** : Clic pendant l'exposition pour annuler

##### Boutons Secondaires
- **Caméra** : Sélection de la caméra active
- **PARAM** : Ouverture du panneau de paramètres
- **Téléchargement** : Accès aux images capturées

## Sélection de Caméra

### Ouverture du Sélecteur
1. Cliquer sur l'icône caméra dans le rail
2. La liste des caméras disponibles s'affiche
3. Sélectionner la caméra désirée
4. Les informations techniques apparaissent

### Informations Affichées
- **Nom et Modèle** : Identification de la caméra
- **Driver** : Pilote INDI utilisé
- **Résolution** : Taille du capteur en pixels
- **Taille de Pixel** : En micromètres
- **Binning Max** : Regroupement maximum possible
- **Refroidissement** : Disponibilité du refroidissement

## Paramètres de Capture

### Exposition
- **Curseur** : Réglage de 1ms à 5 minutes
- **Affichage** : Temps formaté (ms, s, m)
- **Mise à jour** : Temps réel pendant l'exposition

### Gain
- **Plage** : 0 à 100%
- **Recommandation** : 50-80% pour la plupart des objets
- **Effet** : Sensibilité du capteur

### Binning
- **Options** : 1×1, 2×2, 3×3, 4×4
- **1×1** : Résolution maximale
- **2×2** : Sensibilité ×4, résolution ÷2
- **Plus élevé** : Pour objets très faibles

### Type de Frame
- **Light** : Exposition normale de l'objet
- **Dark** : Calibration du bruit (même durée/gain)
- **Flat** : Calibration du vignettage
- **Bias** : Calibration du bruit de lecture

### Format de Fichier
- **FITS** : Recommandé pour l'astronomie
- **TIFF** : Compatible logiciels photo
- **RAW** : Format natif (DSLR uniquement)

### Qualité (TIFF uniquement)
- **Plage** : 1% à 100%
- **Recommandation** : 90% pour préserver les détails

## Processus de Capture

### Démarrage
1. Sélectionner la caméra
2. Configurer les paramètres
3. Cliquer sur le déclencheur
4. L'exposition démarre automatiquement

### Pendant l'Exposition
- **Barre de Progression** : Avancement circulaire
- **Temps Restant** : Compte à rebours précis
- **Annulation** : Clic sur le bouton pour arrêter

### Fin d'Exposition
- **Sauvegarde** : Automatique dans le dossier images
- **Notification** : Indication de fin de capture
- **Accès** : Bouton téléchargement pour voir l'image

## Gestion des Erreurs

### Erreurs Communes
- **Caméra non connectée** : Vérifier la sélection
- **Paramètres invalides** : Ajuster exposition/gain
- **Erreur de capture** : Redémarrer l'exposition

### Messages d'Erreur
- **Affichage** : En bas du rail de caméra
- **Couleur** : Rouge avec fond sombre
- **Persistance** : Jusqu'à la prochaine action réussie

## Persistance des Paramètres

### Sauvegarde Automatique
- **Paramètres** : Sauvegardés à chaque modification
- **Caméra** : Sélection mémorisée
- **Restauration** : Automatique au rechargement

### Perte de Connexion
- **Reconnexion** : Paramètres préservés
- **Serveur** : État complet restauré
- **Continuité** : Reprise transparente

## Conseils d'Utilisation

### Première Utilisation
1. Sélectionner la caméra
2. Commencer avec des paramètres conservateurs
3. Tester avec une exposition courte
4. Ajuster selon les résultats

### Optimisation
- **Histogramme** : Vérifier l'exposition
- **Température** : Refroidir si possible
- **Binning** : Équilibrer résolution/sensibilité

### Séquences Longues
- **Stabilité** : Vérifier la connexion
- **Batterie** : Surveiller l'alimentation
- **Météo** : Conditions stables requises

## Raccourcis Clavier

### Navigation
- **Espace** : Démarrer/arrêter l'exposition
- **Échap** : Fermer les panneaux ouverts
- **Tab** : Naviguer entre les contrôles

### Paramètres Rapides
- **+/-** : Ajuster l'exposition
- **Ctrl + B** : Changer le binning
- **Ctrl + G** : Ajuster le gain

## Maintenance

### Vérifications Régulières
- **Connexion** : Stabilité du réseau
- **Température** : Refroidissement optimal
- **Espace** : Stockage disponible

### Nettoyage
- **Images** : Supprimer les captures de test
- **Logs** : Archiver les journaux anciens
- **Cache** : Vider si nécessaire
