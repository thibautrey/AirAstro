# Scripts de Gestion mDNS pour AirAstro

Ce répertoire contient les scripts pour configurer et gérer la découverte de service mDNS/Zeroconf au niveau système pour AirAstro.

## Vue d'ensemble

AirAstro utilise une approche **double couche** pour la découverte de service :
- **Couche Système** : Avahi (daemon mDNS du système)
- **Couche Application** : Bibliothèque Bonjour Node.js

Cette approche garantit une découverte robuste même en cas de redémarrage de l'application.

## Scripts Disponibles

### 🔧 Configuration

#### `configure-mdns.sh`
**Configuration complète du mDNS système**
```bash
sudo ./configure-mdns.sh
```

**Actions :**
- Installation d'Avahi et dépendances
- Configuration du hostname `airastro`
- Création du service Avahi
- Configuration optimisée du daemon
- Tests de validation

---

#### `update-mdns.sh`
**Mise à jour mDNS pour installations existantes**
```bash
sudo ./update-mdns.sh
```

**Actions :**
- Sauvegarde de la configuration actuelle
- Application de la nouvelle configuration mDNS
- Redémarrage des services
- Vérification finale

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

### Diagnostic
```bash
# Vérification de la configuration
./check-mdns.sh

# Test depuis un autre appareil
./test-remote-connectivity.sh airastro.local
```

### Dépannage
```bash
# Reconfiguration complète
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

| Service | Type | Port | Description |
|---------|------|------|-------------|
| HTTP Principal | `_http._tcp` | 80 | Interface web AirAstro |
| SSH | `_ssh._tcp` | 22 | Accès administration |
| Développement | `_http._tcp` | 3000 | Serveur dev (si actif) |

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
