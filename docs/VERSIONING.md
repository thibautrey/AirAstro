# Système d'Auto-Versioning AirAstro

Ce système automatise l'incrémentation des versions des packages en fonction des changements dans le repository.

## 🚀 Fonctionnement

### Déclenchement automatique

Le système se déclenche automatiquement sur :

- Push sur les branches `main` ou `master`
- Merge de Pull Requests

### Détection intelligente

Le système analyse :

1. **Message de commit** pour déterminer le type d'incrémentation
2. **Fichiers modifiés** pour identifier quels packages mettre à jour

### Types d'incrémentation

| Type de commit                   | Incrémentation | Exemple       |
| -------------------------------- | -------------- | ------------- |
| `feat:` `feature:` `add:` `new:` | **Minor**      | 1.0.0 → 1.1.0 |
| `fix:` `bug:` `hotfix:`          | **Patch**      | 1.0.0 → 1.0.1 |
| `breaking:` `break:` `major:`    | **Major**      | 1.0.0 → 2.0.0 |
| Autres                           | **Patch**      | 1.0.0 → 1.0.1 |

### Commits ignorés

Ces types de commits n'incrémentent PAS les versions :

- `docs:` - Documentation
- `chore:` - Tâches de maintenance
- `ci:` - Configuration CI/CD
- `test:` - Tests
- `style:` - Formatage
- `refactor:` - Refactoring

## 📦 Packages surveillés

| Package    | Chemin           | Version actuelle |
| ---------- | ---------------- | ---------------- |
| Server     | `server/`        | 0.0.1            |
| Web App    | `apps/web/`      | 0.0.1            |
| Mobile App | `apps/airastro/` | 1.0.0            |

## 🏷️ Tags Git

Le système crée automatiquement des tags pour chaque version :

- `server-v1.0.1`
- `web-v1.0.1`
- `mobile-v1.0.1`

## 🛠️ Utilisation manuelle

### Script d'incrémentation

```bash
# Incrémenter un package spécifique
./scripts/increment-version.sh server patch
./scripts/increment-version.sh web minor
./scripts/increment-version.sh mobile major

# Incrémenter tous les packages
./scripts/increment-version.sh all patch
```

### Analyse de commit

```bash
# Analyser un message de commit
./scripts/analyze-commit.sh "feat: nouvelle fonctionnalité"
# Output: minor

./scripts/analyze-commit.sh "fix: correction bug"
# Output: patch

./scripts/analyze-commit.sh "docs: mise à jour documentation"
# Output: IGNORE
```

## 📋 Exemples de commits

### ✅ Commits qui incrémentent les versions

```bash
# Nouvelle fonctionnalité (minor)
git commit -m "feat: ajout de la fonction de guidage automatique"

# Correction de bug (patch)
git commit -m "fix: correction du problème de connexion caméra"

# Changement breaking (major)
git commit -m "breaking: refonte de l'API de contrôle du mount"
```

### ❌ Commits qui n'incrémentent PAS les versions

```bash
# Documentation
git commit -m "docs: mise à jour du README"

# Maintenance
git commit -m "chore: nettoyage du code"

# Tests
git commit -m "test: ajout de tests unitaires"
```

## 🔧 Configuration

### Fichier `.autoversion.conf`

Permet de personnaliser le comportement du système :

- Types d'incrémentation par défaut
- Patterns de fichiers à ignorer
- Messages de commit à ignorer

### Variables d'environnement GitHub

Le workflow utilise automatiquement `GITHUB_TOKEN` pour les opérations Git.

## 📊 Workflow GitHub Actions

Le workflow `auto-version.yml` :

1. ✅ Analyse le message de commit
2. 🔍 Détecte les fichiers modifiés
3. 📈 Incrémente les versions appropriées
4. 💾 Commit les changements
5. 🚀 Push les modifications
6. 🏷️ Crée et push les tags

## 🚨 Dépannage

### Le workflow ne se déclenche pas

- Vérifiez que vous êtes sur `main` ou `master`
- Assurez-vous que le commit n'est pas un commit d'auto-versioning

### Les versions ne s'incrémentent pas

- Vérifiez le message de commit (évitez `docs:`, `chore:`, etc.)
- Assurez-vous que les fichiers modifiés sont dans les bons répertoires

### Erreur de permissions

- Vérifiez que `GITHUB_TOKEN` a les permissions nécessaires
- Assurez-vous que la branche n'est pas protégée

## 📝 Logs

Les logs détaillés sont disponibles dans l'onglet "Actions" de GitHub, permettant de :

- Voir quels packages ont été mis à jour
- Comprendre pourquoi un commit a été ignoré
- Déboguer les problèmes de version

---

> 💡 **Conseil** : Utilisez des messages de commit clairs et suivez la convention pour bénéficier pleinement de l'auto-versioning !
