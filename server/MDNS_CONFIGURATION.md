# Configuration mDNS/Zeroconf pour AirAstro

Ce document explique la configuration de la découverte de service mDNS (Multicast DNS) pour AirAstro au niveau du système Raspberry Pi.

## Vue d'ensemble

AirAstro utilise maintenant une approche à double niveau pour la découverte de service :

1. **Niveau Application** : Bibliothèque Bonjour dans Node.js
2. **Niveau Système** : Service Avahi configuré au niveau du système d'exploitation

Cette approche garantit une découverte de service robuste même si l'application Node.js redémarre ou rencontre des problèmes.

## Architecture

```
┌─────────────────────────────────────────┐
│             Réseau Local                │
│  ┌─────────────────────────────────────┐ │
│  │      Clients (ordinateurs,         │ │
│  │      téléphones, tablettes)        │ │
│  │                                    │ │
│  │  Recherche: airastro.local         │ │
│  └─────────────────┬───────────────────┘ │
│                    │ mDNS Query          │
│                    ▼                     │
│  ┌─────────────────────────────────────┐ │
│  │        Raspberry Pi                 │ │
│  │                                    │ │
│  │  ┌─────────────────────────────────┐ │ │
│  │  │      Avahi Daemon              │ │ │
│  │  │   (Niveau Système)             │ │ │
│  │  │                                │ │ │
│  │  │  • airastro.service            │ │ │
│  │  │  • Annonce _http._tcp:80       │ │ │
│  │  │  • Annonce _ssh._tcp:22        │ │ │
│  │  │  • Hostname: airastro.local    │ │ │
│  │  └─────────────────────────────────┘ │ │
│  │                                    │ │
│  │  ┌─────────────────────────────────┐ │ │
│  │  │      Application Node.js        │ │ │
│  │  │    (Niveau Application)         │ │ │
│  │  │                                │ │ │
│  │  │  • Bibliothèque Bonjour        │ │ │
│  │  │  • Annonces dynamiques         │ │ │
│  │  │  • Métadonnées enrichies       │ │ │
│  │  └─────────────────────────────────┘ │ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## Configuration du Système

### Service Avahi

Le fichier `/etc/avahi/services/airastro.service` configure les services annoncés :

```xml
<?xml version="1.0" standalone='no'?>
<!DOCTYPE service-group SYSTEM "avahi-service.dtd">

<service-group>
  <name replace-wildcards="yes">AirAstro sur %h</name>

  <!-- Service HTTP principal -->
  <service>
    <type>_http._tcp</type>
    <port>80</port>
    <txt-record>description=Serveur d'Astronomie AirAstro</txt-record>
    <txt-record>version=0.0.1</txt-record>
    <txt-record>path=/</txt-record>
    <txt-record>interface=web</txt-record>
  </service>

  <!-- Service SSH pour la maintenance -->
  <service>
    <type>_ssh._tcp</type>
    <port>22</port>
    <txt-record>description=SSH AirAstro</txt-record>
  </service>
</service-group>
```

### Configuration du Hostname

- **Hostname système** : `airastro`
- **Nom mDNS** : `airastro.local`
- **Configuration dans** : `/etc/hostname` et `/etc/hosts`

### Daemon Avahi

Configuration optimisée dans `/etc/avahi/avahi-daemon.conf` :

- Interfaces autorisées : `wlan0`, `eth0`
- Publication activée pour tous les types de services
- Cache optimisé pour les performances

## Scripts de Gestion

### `configure-mdns.sh`

Configure complètement mDNS/Avahi pour AirAstro :

```bash
sudo ./configure-mdns.sh
```

**Actions effectuées :**

- Installation d'Avahi et dépendances
- Configuration du hostname `airastro`
- Création du service Avahi
- Configuration optimisée du daemon
- Tests de validation

### `check-mdns.sh`

Diagnostic complet de la configuration mDNS :

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

### `cleanup-mdns.sh`

Nettoyage de la configuration mDNS :

```bash
sudo ./cleanup-mdns.sh
```

**Actions :**

- Suppression du service AirAstro
- Restauration de la configuration originale
- Option de restauration du hostname

## Avantages de cette Approche

### 1. Redondance

- Si l'application Node.js plante, Avahi continue d'annoncer le service
- Si Avahi redémarre, Node.js maintient ses annonces

### 2. Performance

- Résolution mDNS au niveau du kernel (plus rapide)
- Cache système optimisé
- Moins de latence pour la découverte

### 3. Fiabilité

- Service système indépendant de l'application
- Démarrage automatique au boot
- Gestion des erreurs réseau

### 4. Compatibilité

- Compatible avec tous les clients mDNS/Bonjour
- Fonctionne avec les navigateurs modernes
- Support des appareils iOS/macOS natif

## Dépannage

### Service non découvert

1. **Vérifier Avahi :**

   ```bash
   sudo systemctl status avahi-daemon
   sudo systemctl restart avahi-daemon
   ```

2. **Tester la résolution :**

   ```bash
   avahi-resolve-host-name airastro.local
   ping airastro.local
   ```

3. **Vérifier les services annoncés :**
   ```bash
   avahi-browse -t _http._tcp
   ```

### Problèmes de réseau

1. **Vérifier les interfaces :**

   ```bash
   ip addr show
   ```

2. **Vérifier la configuration Avahi :**

   ```bash
   sudo avahi-daemon --check
   ```

3. **Logs système :**
   ```bash
   journalctl -u avahi-daemon -f
   ```

### Conflits d'hostname

Si plusieurs appareils utilisent le même nom :

```bash
# Changer le hostname
sudo hostnamectl set-hostname airastro-2
sudo systemctl restart avahi-daemon
```

## Intégration avec l'Application

L'application Node.js continue d'utiliser la bibliothèque Bonjour pour :

- Métadonnées dynamiques (version, état)
- Services temporaires (développement)
- Informations détaillées sur l'état du système

Les deux systèmes coexistent et se complètent pour une expérience utilisateur optimale.

## Tests de Validation

### Test automatique complet

```bash
cd /path/to/AirAstro/server/scripts
./check-mdns.sh
```

### Tests manuels

1. **Résolution DNS :**

   ```bash
   nslookup airastro.local
   dig airastro.local
   ```

2. **Connectivité HTTP :**

   ```bash
   curl http://airastro.local/api/ping
   ```

3. **Découverte de service :**
   ```bash
   avahi-browse -a
   ```

Cette configuration garantit une découverte de service robuste et fiable pour AirAstro sur tous les réseaux locaux.
