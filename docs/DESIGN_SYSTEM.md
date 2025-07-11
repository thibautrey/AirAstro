# AirAstro Design System

## Philosophie de Design

AirAstro adopte un design système spécialement conçu pour l'astronomie, privilégiant :

- **Vision nocturne préservée** : Couleurs sombres et rouge pour maintenir l'adaptation à l'obscurité
- **Lisibilité optimale** : Contrastes élevés et typographie claire
- **Interface moderne** : Design clean et cohérent sur toutes les plateformes

## Palette de Couleurs

### Couleurs Principales

#### Arrière-plans

- **Background Principal** : `#000000` (Noir pur) - Préserve la vision nocturne
- **Background Secondaire** : `#1A1A1A` (Gris très sombre) - Pour les cartes et sections
- **Background Tertiaire** : `#2D2D2D` (Gris sombre) - Pour les éléments interactifs

#### Textes

- **Texte Principal** : `#FFFFFF` (Blanc pur) - Maximum de lisibilité
- **Texte Secondaire** : `#B0B0B0` (Gris clair) - Pour les informations secondaires
- **Texte Rouge** : `#FF4444` (Rouge vif) - Pour les erreurs critiques uniquement
- **Texte Bleu** : `#2563eb` (Bleu vif) - Pour les alertes et éléments d'attention

#### Boutons et Actions

- **Bouton Principal** : `#00AA00` (Vert vif) - Actions principales et confirmations
- **Bouton Secondaire** : `#0080FF` (Bleu vif) - Actions secondaires et navigation
- **Bouton Attention** : `#2563eb` (Bleu moyen) - Actions d'attention et alertes
- **Bouton Danger** : `#FF4444` (Rouge vif) - Actions destructives uniquement
- **Bouton Désactivé** : `#666666` (Gris moyen) - États inactifs

#### États et Indicateurs

- **Succès** : `#00DD00` (Vert clair) - Statuts positifs
- **Attention** : `#FFAA00` (Orange) - Avertissements
- **Alerte** : `#2563eb` (Bleu) - Alertes et notifications importantes
- **Erreur** : `#FF4444` (Rouge vif) - Erreurs critiques et problèmes graves
- **Information** : `#00AAFF` (Bleu clair) - Informations neutres

### Code Couleurs (Swift)

```swift
// Dans un fichier Colors.swift
extension Color {
    static let astronomyBackground = Color(.black)
    static let astronomyBackgroundSecondary = Color(red: 26/255, green: 26/255, blue: 26/255)
    static let astronomyBackgroundTertiary = Color(red: 45/255, green: 45/255, blue: 45/255)

    static let astronomyTextPrimary = Color(.white)
    static let astronomyTextSecondary = Color(red: 176/255, green: 176/255, blue: 176/255)
    static let astronomyTextRed = Color(red: 255/255, green: 68/255, blue: 68/255)

    static let astronomyGreen = Color(red: 0/255, green: 170/255, blue: 0/255)
    static let astronomyBlue = Color(red: 0/255, green: 128/255, blue: 255/255)
    static let astronomyRed = Color(red: 255/255, green: 68/255, blue: 68/255)
}
```

## Typographie

### Hiérarchie des Tailles

- **Titre Principal** : 32pt, Bold
- **Titre Secondaire** : 24pt, Semibold
- **Sous-titre** : 18pt, Medium
- **Corps** : 16pt, Regular
- **Caption** : 12pt, Regular
- **Small** : 10pt, Regular

### Police Recommandée

- **iOS** : SF Pro (système)
- **Android** : Roboto (système)
- **Caractéristiques** : Excellente lisibilité, optimisée pour les écrans

## Composants UI

### Boutons

#### Bouton Principal (Vert)

- Background : `astronomyGreen`
- Texte : `astronomyTextPrimary`
- Padding : 16pt vertical, 24pt horizontal
- Border radius : 8pt
- Ombre : 2pt blur

#### Bouton Secondaire (Bleu)

- Background : `astronomyBlue`
- Texte : `astronomyTextPrimary`
- Padding : 12pt vertical, 20pt horizontal
- Border radius : 6pt

#### Bouton Attention (Bleu Moyen)

- Background : `#2563eb`
- Texte : `astronomyTextPrimary`
- Padding : 12pt vertical, 20pt horizontal
- Border radius : 6pt

#### Bouton Danger (Rouge)

- Background : `astronomyRed`
- Texte : `astronomyTextPrimary`
- Padding : 12pt vertical, 20pt horizontal
- Border radius : 6pt
- Utilisation : Actions destructives uniquement

### Cartes et Conteneurs

#### Carte Standard

- Background : `astronomyBackgroundSecondary`
- Border radius : 12pt
- Padding : 16pt
- Border : 1pt solid `astronomyBackgroundTertiary`

#### Carte Sélectionnée

- Background : `astronomyBackgroundSecondary`
- Border : 2pt solid `astronomyBlue`
- Border radius : 12pt
- Glow effect : `astronomyBlue` avec 4pt blur

### Champs de Saisie

#### Input Standard

- Background : `astronomyBackgroundTertiary`
- Border : 1pt solid `astronomyBackgroundTertiary`
- Texte : `astronomyTextPrimary`
- Placeholder : `astronomyTextSecondary`
- Border radius : 8pt
- Padding : 12pt

#### Input Focus

- Border : 2pt solid `astronomyBlue`
- Glow effect : `astronomyBlue` avec 2pt blur

### Indicateurs de Statut

#### Connecté

- Couleur : `astronomyGreen`
- Icône : checkmark.circle.fill

#### Déconnecté

- Couleur : `astronomyRed`
- Icône : xmark.circle.fill

#### En attente

- Couleur : `#FFAA00`
- Icône : clock.circle.fill

## Espacements

### Système de Grille (8pt)

- **XXS** : 4pt
- **XS** : 8pt
- **S** : 16pt
- **M** : 24pt
- **L** : 32pt
- **XL** : 48pt
- **XXL** : 64pt

## Accessibilité

### Contraste

- Ratio minimum : 4.5:1 pour le texte normal
- Ratio minimum : 3:1 pour le texte large
- Tous les textes sur fond noir respectent ces ratios

### Vision Nocturne

- Éviter le bleu pur dans les zones importantes
- Privilégier le rouge pour les alertes
- Utiliser des contrastes élevés

### Tailles Tactiles

- Minimum 44pt x 44pt pour tous les éléments interactifs
- Espacement minimum de 8pt entre les éléments

## Animation et Transitions

### Durées Standard

- **Micro** : 0.1s - Feedbacks immédiats
- **Court** : 0.2s - Changements d'états
- **Moyen** : 0.3s - Transitions de vues
- **Long** : 0.5s - Animations complexes

### Courbes d'Animation

- **ease-out** : Pour les entrées d'éléments
- **ease-in** : Pour les sorties d'éléments
- **ease-in-out** : Pour les transitions

## Responsive Design

### Breakpoints

- **Mobile** : < 768pt
- **Tablet** : 768pt - 1024pt
- **Desktop** : > 1024pt

### Adaptations

- Tailles de texte proportionnelles
- Espacements adaptatifs
- Navigation contextuelle selon la taille d'écran
