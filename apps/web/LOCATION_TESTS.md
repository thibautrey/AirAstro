# Tests de Fonctionnalité - Sélecteur de Localisation

## Scénarios de Test

### 1. Premier lancement (aucune localisation sauvegardée)

**Actions :**

1. Ouvrir l'application pour la première fois
2. Observer l'écran de bienvenue

**Résultats attendus :**

- ✅ Tentative automatique de géolocalisation si permissions accordées
- ✅ Icône de chargement pendant la géolocalisation
- ✅ Bouton "Entrer dans l'appareil" désactivé tant qu'aucune localisation
- ✅ Message "Localisation requise" sur le bouton si pas de GPS
- ✅ Notification jaune expliquant pourquoi la localisation est nécessaire

### 2. Permissions GPS accordées

**Actions :**

1. Autoriser la géolocalisation quand demandée
2. Attendre la réponse GPS

**Résultats attendus :**

- ✅ Icône GPS verte une fois la position obtenue
- ✅ Affichage du nom de ville ou coordonnées formatées
- ✅ Bouton "Entrer dans l'appareil" activé
- ✅ Sauvegarde automatique en localStorage
- ✅ Pas de notification jaune

### 3. Permissions GPS refusées

**Actions :**

1. Refuser la géolocalisation
2. Observer les changements d'interface

**Résultats attendus :**

- ✅ Icône d'erreur rouge/orange
- ✅ Message "Géolocalisation refusée - Cliquez pour saisir manuellement"
- ✅ Bordure jaune autour de la zone de localisation
- ✅ Bouton désactivé jusqu'à saisie manuelle
- ✅ Notification jaune visible

### 4. Saisie manuelle de coordonnées

**Actions :**

1. Cliquer sur la zone de localisation
2. Aller dans l'onglet "Manuel"
3. Saisir latitude : 48.8566, longitude : 2.3522
4. Valider

**Résultats attendus :**

- ✅ Modal s'ouvre avec deux onglets
- ✅ Validation en temps réel des coordonnées
- ✅ Bouton de validation activé seulement si coordonnées valides
- ✅ Fermeture de la modal après validation
- ✅ Affichage "Paris, France" (si détection de ville configurée)
- ✅ Bouton principal activé

### 5. GPS avec position ancienne (>24h)

**Actions :**

1. Simuler une position sauvegardée ancienne
2. Relancer l'application

**Résultats attendus :**

- ✅ Chargement de l'ancienne position
- ✅ Tentative automatique de nouvelle géolocalisation
- ✅ Mise à jour si nouvelle position disponible

### 6. Persistance des données

**Actions :**

1. Définir une localisation
2. Actualiser la page
3. Observer le comportement

**Résultats attendus :**

- ✅ Position restaurée depuis localStorage
- ✅ Bouton immédiatement activé si position récente
- ✅ Tentative de mise à jour en arrière-plan

### 7. Gestion des erreurs GPS

**Actions :**

1. Simuler un délai d'attente GPS
2. Simuler une position indisponible

**Résultats attendus :**

- ✅ Message d'erreur approprié
- ✅ Icône d'avertissement
- ✅ Possibilité de réessayer ou saisir manuellement

### 8. Interface responsive

**Actions :**

1. Tester sur mobile
2. Tester sur desktop

**Résultats attendus :**

- ✅ Modal s'adapte à la taille d'écran
- ✅ Textes lisibles sur petits écrans
- ✅ Boutons accessibles au touch

## Validation de l'intégration

### Page Equipment Setup

**Actions :**

1. Accéder à la page avec une localisation définie

**Résultats attendus :**

- ✅ Affichage compact de la localisation en haut de page
- ✅ Informations de précision visibles
- ✅ Timestamp de dernière mise à jour

### Cas d'erreur

**Scénarios à valider :**

- ✅ localStorage corrompu ou inaccessible
- ✅ Navigateur sans support géolocalisation
- ✅ Connexion réseau instable
- ✅ Permissions révoquées après accord initial

## Performance

**Métriques à vérifier :**

- ✅ Chargement initial < 100ms
- ✅ Géolocalisation < 10 secondes
- ✅ Pas de fuite mémoire sur usage prolongé
- ✅ Bundle size impact minimal

## Accessibilité

**Points à valider :**

- ✅ Navigation au clavier dans la modal
- ✅ Annonces des changements d'état
- ✅ Contraste suffisant pour les indicateurs colorés
- ✅ Labels appropriés pour screen readers

---

## Notes d'implémentation

- La détection automatique de ville est simulée pour la démo
- En production, intégrer une API de géocodage inverse
- Considérer l'ajout d'une carte pour sélection visuelle
- Implémenter la validation côté serveur des coordonnées
