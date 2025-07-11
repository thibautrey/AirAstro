# Scripts de diagnostic

Ce dossier contient tous les scripts de diagnostic et de réparation pour AirAstro.

## Scripts disponibles

### `debug-airastro.sh`

**Script de débogage principal**

- Collecte les informations système
- Analyse les logs
- Identifie les problèmes courants

**Utilisation :**

```bash
./diagnostics/debug-airastro.sh
```

### `fix-airastro.sh`

**Réparation automatique des problèmes**

- Corrige les problèmes courants
- Remet à zéro les configurations
- Relance les services

**Utilisation :**

```bash
./diagnostics/fix-airastro.sh
```

### `status.sh`

**Statut complet du système**

- Affiche l'état de tous les composants
- Vérifie les services
- Montre les équipements connectés

**Utilisation :**

```bash
./diagnostics/status.sh
```

### `quick-status.sh`

**Statut rapide**

- Résumé rapide de l'état du système
- Indicateurs visuels
- Problèmes prioritaires

**Utilisation :**

```bash
./diagnostics/quick-status.sh
```

### Scripts de réparation spécifiques

#### `fix-driver-detection.sh`

**Réparation de la détection des drivers**

- Corrige les problèmes de détection d'équipements
- Recharge les drivers
- Met à jour les règles udev

#### `fix-indi-repository.sh`

**Réparation des dépôts INDI**

- Corrige les problèmes de dépôts APT
- Met à jour les clés GPG
- Synchronise les packages

#### `quick-fix.sh`

**Réparation rapide**

- Corrige les problèmes les plus courants
- Redémarre les services essentiels
- Vérifie les permissions

#### `quick-fix-apt-key.sh`

**Réparation des clés APT**

- Corrige les problèmes de clés GPG
- Met à jour les dépôts
- Résout les erreurs d'authentification

## Diagnostic automatique

### Vérifications effectuées

1. **Système de base**

   - ✅ Version du système
   - ✅ Espace disque disponible
   - ✅ Mémoire disponible
   - ✅ Processus en cours

2. **Services AirAstro**

   - ✅ Service principal
   - ✅ Service INDI
   - ✅ Service réseau
   - ✅ Base de données

3. **Drivers et équipements**

   - ✅ Drivers INDI installés
   - ✅ Équipements détectés
   - ✅ Permissions USB
   - ✅ Règles udev

4. **Réseau**
   - ✅ Connectivité réseau
   - ✅ Configuration mDNS
   - ✅ Ports ouverts
   - ✅ Pare-feu

### Niveaux de diagnostic

#### 🟢 **Vert** - Tout fonctionne

- Système opérationnel
- Tous les services actifs
- Équipements détectés

#### 🟡 **Jaune** - Avertissements

- Problèmes mineurs
- Optimisations possibles
- Recommandations

#### 🔴 **Rouge** - Problèmes critiques

- Services arrêtés
- Erreurs de configuration
- Équipements non détectés

## Utilisation recommandée

### Diagnostic quotidien

```bash
./diagnostics/quick-status.sh
```

### Diagnostic complet

```bash
./diagnostics/status.sh
```

### En cas de problème

```bash
# 1. Diagnostic
./diagnostics/debug-airastro.sh

# 2. Réparation automatique
./diagnostics/fix-airastro.sh

# 3. Vérification
./diagnostics/status.sh
```

## Logs et fichiers de diagnostic

### Emplacements des logs

- `/var/log/airastro/` - Logs AirAstro
- `/var/log/indi/` - Logs INDI
- `~/.airastro/logs/` - Logs utilisateur
- `/tmp/airastro-debug.log` - Log de débogage

### Commandes utiles

```bash
# Voir les logs en temps réel
tail -f /var/log/airastro/airastro.log

# Logs système
journalctl -u airastro

# Logs INDI
journalctl -u indiserver
```

## Codes de sortie

- **0** - Succès, pas de problème
- **1** - Avertissements mineurs
- **2** - Problèmes modérés
- **3** - Problèmes critiques
- **4** - Erreur du script

## Intégration avec l'interface web

Les scripts de diagnostic sont intégrés dans l'interface web AirAstro :

- Statut en temps réel
- Alertes automatiques
- Boutons de réparation
- Logs consultables

## Maintenance préventive

### Vérifications recommandées

**Quotidien :**

- Statut rapide des services
- Vérification des équipements connectés

**Hebdomadaire :**

- Diagnostic complet
- Vérification des logs
- Nettoyage des fichiers temporaires

**Mensuel :**

- Mise à jour des drivers
- Vérification des permissions
- Optimisation des performances

### Automatisation

```bash
# Ajouter au crontab pour vérification quotidienne
0 8 * * * /path/to/diagnostics/quick-status.sh

# Diagnostic complet hebdomadaire
0 8 * * 0 /path/to/diagnostics/status.sh
```
