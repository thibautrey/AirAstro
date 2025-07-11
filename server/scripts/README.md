# Scripts de Gestion des Drivers INDI - AirAstro

Ce répertoire contient les scripts pour gérer automatiquement tous les drivers INDI dans le système AirAstro.

## 🚨 NOUVEAU : Outils de résolution des problèmes

Suite à la résolution du problème apt-key, de nouveaux outils ont été ajoutés :

### 🎛️ **Scripts de résolution immédiate**

| Script                         | Description                                    | Utilisation                      |
| ------------------------------ | ---------------------------------------------- | -------------------------------- |
| `quick-fix-apt-key.sh`         | **Correction immédiate du problème apt-key**   | `./quick-fix-apt-key.sh`         |
| `indi-manager.sh`              | **Menu interactif pour toute la gestion INDI** | `./indi-manager.sh`              |
| `monitor-indi-installation.sh` | **Surveillance temps réel des installations**  | `./monitor-indi-installation.sh` |
| `quick-status.sh`              | **État rapide du système**                     | `./quick-status.sh`              |

### 📊 **Nouveaux outils de diagnostic**

| Script                    | Description                              | Utilisation                 |
| ------------------------- | ---------------------------------------- | --------------------------- |
| `diagnose-indi-system.sh` | **Diagnostic complet du système INDI**   | `./diagnose-indi-system.sh` |
| `fix-indi-repository.sh`  | **Réparation automatique du dépôt INDI** | `./fix-indi-repository.sh`  |
| `clean-indi-system.sh`    | **Nettoyage complet du système**         | `./clean-indi-system.sh`    |

### 🚀 **Utilisation recommandée après le problème apt-key**

```bash
# 1. Correction rapide du problème
./quick-fix-apt-key.sh

# 2. Utilisation du manager interactif
./indi-manager.sh

# 3. Surveillance de l'installation
./monitor-indi-installation.sh
```

---

## 🎯 Objectif

Le système AirAstro télécharge et installe automatiquement **TOUS** les drivers INDI disponibles pour s'assurer qu'aucun équipement ne soit rejeté à cause d'un driver manquant.

## 📋 Scripts Disponibles

### 1. `maintain-indi-drivers.sh`

**Script principal de maintenance et d'installation des drivers INDI**

```bash
# Installation complète (prioritaires + tous les autres)
./maintain-indi-drivers.sh install-missing
./maintain-indi-drivers.sh update-all
```

**Fonctionnalités :**

- Installe TOUS les drivers INDI disponibles dans les dépôts
- Priorité aux drivers les plus courants (ZWO, QHY, Celestron, etc.)
- Configuration automatique des permissions USB
- Création du service INDI systemd

### 2. `update-airastro-system.sh`

**Script de mise à jour complète du système**

```bash
# Lister les drivers disponibles
./maintain-indi-drivers.sh list-available

# Installer tous les drivers manquants
./maintain-indi-drivers.sh install-missing

# Mettre à jour tous les drivers
./maintain-indi-drivers.sh update-all

# Générer un rapport complet
./maintain-indi-drivers.sh report

# Configurer la mise à jour automatique quotidienne
./maintain-indi-drivers.sh setup-auto-update
```

### 3. `startup-drivers.sh`

**Script de démarrage automatique**

```bash
# Mise à jour complète
./update-airastro-system.sh

# Mise à jour des drivers uniquement
./update-airastro-system.sh --drivers-only
```

### 4. `install-indi-drivers.sh` *(legacy)*

**Ancien script d'installation complet (toujours disponible au besoin)**

Ce script s'exécute automatiquement au démarrage du serveur AirAstro.

## 🎯 Résolution du problème ZWO ASI120MM

### Problème identifié

- La caméra ZWO ASI120MM était classée comme "guide-camera" uniquement
- Le driver `indi-asi` n'était pas installé automatiquement
- Confiance élevée mais driver "not-found"

### Solution implémentée

1. **Base de données mise à jour** : ASI120MM reclassée comme "camera"
2. **Installation automatique** : Tous les drivers ZWO installés
3. **Détection améliorée** : Caméras guide utilisables comme principales
4. **Mise à jour continue** : Système de mise à jour automatique

## 🚀 Installation et Configuration

### 1. Installation initiale

```bash
cd /path/to/airastro/server/scripts
chmod +x *.sh
./maintain-indi-drivers.sh install-missing
./maintain-indi-drivers.sh update-all
```

### 2. Configuration de la mise à jour automatique

```bash
./maintain-indi-drivers.sh setup-auto-update
```

---

## Scripts mDNS (existants)

---

#### `build-server.sh`

**Compilation du serveur AirAstro**

```bash
./build-server.sh
```

**Actions :**

- Vérification des dépendances
- Compilation TypeScript
- Tests de syntaxe
- Validation du démarrage

---

### 🔍 Diagnostic

#### `check-mdns.sh`

**Diagnostic complet de la configuration mDNS**

```bash
./check-mdns.sh
```

**Vérifications :**

- État du service Avahi
- Configuration du hostname
- Résolution mDNS
- Services annoncés
- Connectivité réseau
- Fonctionnement HTTP

---

#### `debug-airastro.sh`

**Diagnostic approfondi du service AirAstro**

```bash
./debug-airastro.sh
```

**Analyses :**

- État du service systemd
- Vérification des fichiers
- Configuration Node.js
- Ports et processus
- Dépendances
- Suggestions de réparation

---

#### `test-remote-connectivity.sh`

**Test de connectivité depuis un autre appareil**

```bash
./test-remote-connectivity.sh [hostname]
```

**Exemple :**

```bash
./test-remote-connectivity.sh airastro.local
```

**Tests :**

- Résolution DNS/mDNS
- Ping
- Connectivité HTTP
- Interface web
- Découverte de services

---

### 🛠️ Réparation

#### `fix-airastro.sh`

**Réparation automatique du service AirAstro**

```bash
sudo ./fix-airastro.sh
```

**Actions :**

- Arrêt du service défaillant
- Mise à jour des dépendances
- Recompilation de l'application
- Reconfiguration du service systemd
- Tests de validation
- Redémarrage sécurisé

---

### 🧹 Maintenance

#### `cleanup-mdns.sh`

**Nettoyage de la configuration mDNS**

```bash
sudo ./cleanup-mdns.sh
```

**Actions :**

- Suppression du service AirAstro
- Restauration de la configuration originale
- Option de restauration du hostname

---

## Utilisation Typique

### Installation Fraîche

```bash
# Lors de l'installation, configure-mdns.sh est appelé automatiquement
sudo ./install-on-rpi.sh
```

### Installation Existante

```bash
# Mise à jour d'une installation existante
sudo ./update-mdns.sh
```

### Build/Compilation

```bash
# Compilation du serveur
./build-server.sh
```

### Diagnostic

```bash
# Vérification de la configuration mDNS
./check-mdns.sh

# Diagnostic approfondi d'AirAstro
./debug-airastro.sh

# Test depuis un autre appareil
./test-remote-connectivity.sh airastro.local
```

### Réparation

```bash
# Réparation automatique complète
sudo ./fix-airastro.sh
```

### Dépannage

```bash
# Reconfiguration complète mDNS
sudo ./configure-mdns.sh

# En cas de problème, nettoyage
sudo ./cleanup-mdns.sh
```

## Configuration Générée

### Service Avahi (`/etc/avahi/services/airastro.service`)

```xml
<service-group>
  <name replace-wildcards="yes">AirAstro sur %h</name>
  <service>
    <type>_http._tcp</type>
    <port>80</port>
    <txt-record>description=Serveur d'Astronomie AirAstro</txt-record>
  </service>
</service-group>
```

### Hostname Système

- **Hostname** : `airastro`
- **mDNS** : `airastro.local`
- **Fichiers** : `/etc/hostname`, `/etc/hosts`

## Services Annoncés

| Service        | Type         | Port | Description            |
| -------------- | ------------ | ---- | ---------------------- |
| HTTP Principal | `_http._tcp` | 80   | Interface web AirAstro |
| SSH            | `_ssh._tcp`  | 22   | Accès administration   |
| Développement  | `_http._tcp` | 3000 | Serveur dev (si actif) |

## Intégration avec Node.js

Le code Node.js est configuré pour :

- Détecter la présence d'Avahi
- Annoncer des métadonnées enrichies
- Maintenir la compatibilité avec les deux couches

```typescript
// Métadonnées enrichies de la couche application
const service = bonjourInstance.publish({
  name: "airastro",
  type: "http",
  port: port,
  txt: {
    description: "AirAstro Astronomy Server",
    version: "0.0.1",
    layer: "application",
    systemMdns: "enabled",
    features: "imaging,guiding,platesolving,scheduler",
  },
});
```

## Dépannage Courant

### Service non découvert

```bash
# Vérifier Avahi
sudo systemctl restart avahi-daemon

# Vérifier la résolution
avahi-resolve-host-name airastro.local

# Diagnostic complet
./check-mdns.sh
```

### Conflits de hostname

```bash
# Changer le hostname temporairement
sudo hostnamectl set-hostname airastro-$(date +%s)
sudo systemctl restart avahi-daemon
```

### Problèmes de réseau

```bash
# Vérifier les interfaces réseau
ip addr show

# Logs Avahi
journalctl -u avahi-daemon -f
```

## Compatibilité

### Systèmes supportés

- ✅ Raspberry Pi OS
- ✅ Ubuntu/Debian
- ✅ Linux générique avec systemd

### Clients compatibles

- ✅ macOS (Bonjour natif)
- ✅ iOS (Bonjour natif)
- ✅ Windows (Bonjour pour Windows)
- ✅ Android (apps avec support mDNS)
- ✅ Navigateurs modernes

## Logs et Monitoring

### Logs Avahi

```bash
journalctl -u avahi-daemon -f
```

### Logs AirAstro

```bash
journalctl -u airastro -f
```

### Monitoring des services

```bash
# Services mDNS actifs
avahi-browse -a

# Résolution en temps réel
watch -n 1 avahi-resolve-host-name airastro.local
```

## Sécurité

### Bonnes pratiques

- Changement du mot de passe SSH par défaut
- Firewall configuré pour le réseau local uniquement
- Mise à jour régulière des dépendances

### Ports ouverts

- Port 80 : Interface web AirAstro
- Port 22 : SSH (administration)
- Port 5353 : mDNS (multicast)

Pour plus de détails techniques, consultez `MDNS_CONFIGURATION.md`.
