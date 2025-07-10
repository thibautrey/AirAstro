# Outils de Diagnostic et Réparation AirAstro

Suite d'outils pour diagnostiquer et réparer les problèmes du service AirAstro.

## 📊 Aperçu Rapide

### `status.sh`

```bash
./status.sh
```

**Aperçu instantané de l'état du système**

- ✅ État des services (AirAstro, mDNS)
- 🌐 Connectivité réseau et HTTP
- 🔧 Utilisation des ressources
- 📋 Logs récents

## 🚀 Réparation Rapide

### `quick-fix.sh`

```bash
sudo ./quick-fix.sh
```

**Résolution automatique des problèmes courants**

- 🔄 Redémarrage des services
- 🛠️ Compilation automatique
- 🔧 Permissions et dépendances
- ✅ Validation fonctionnelle

## 🔍 Diagnostic Approfondi

### `debug-airastro.sh`

```bash
./debug-airastro.sh
```

**Analyse complète du service AirAstro**

- 🔍 État systemd détaillé
- 📁 Vérification des fichiers
- 🟢 Node.js et dépendances
- 🌐 Ports et processus
- 💡 Suggestions de réparation

### `check-mdns.sh`

```bash
./check-mdns.sh
```

**Diagnostic de la configuration mDNS**

- 🔍 État d'Avahi
- 🏠 Configuration hostname
- 🌐 Résolution mDNS
- 📡 Services annoncés
- 🔗 Connectivité HTTP

## 🛠️ Réparation Complète

### `fix-airastro.sh`

```bash
sudo ./fix-airastro.sh
```

**Réparation complète et reconfiguration**

- 🛑 Arrêt sécurisé
- 📦 Mise à jour des dépendances
- 🔨 Recompilation complète
- ⚙️ Reconfiguration systemd
- 🔧 Permissions et sécurité
- ✅ Tests de validation

### `build-server.sh`

```bash
./build-server.sh
```

**Compilation et validation du serveur**

- 📦 Vérification des dépendances
- 🔨 Compilation TypeScript
- ✅ Tests syntaxiques
- 🚀 Validation de démarrage

## 🔧 Configuration

### `configure-mdns.sh`

```bash
sudo ./configure-mdns.sh
```

**Configuration mDNS système**

- 📥 Installation d'Avahi
- 🏠 Configuration hostname
- 📡 Services mDNS
- ⚙️ Configuration optimisée

### `update-mdns.sh`

```bash
sudo ./update-mdns.sh
```

**Mise à jour mDNS existant**

- 💾 Sauvegarde configuration
- 🔄 Mise à jour mDNS
- 🔧 Redémarrage services

## 🧪 Tests

### `test-remote-connectivity.sh`

```bash
./test-remote-connectivity.sh [hostname]
```

**Test de connectivité à distance**

- 🌐 Résolution DNS/mDNS
- 🏓 Test ping
- 🔗 Connectivité HTTP
- 📡 Découverte de services

## 🧹 Maintenance

### `cleanup-mdns.sh`

```bash
sudo ./cleanup-mdns.sh
```

**Nettoyage configuration mDNS**

- 🗑️ Suppression services
- 🔙 Restauration configuration
- 🏠 Réinitialisation hostname

---

## 🎯 Utilisation selon le Problème

### Service ne démarre pas

```bash
# Diagnostic rapide
./status.sh

# Réparation automatique
sudo ./quick-fix.sh

# Si problème persiste
./debug-airastro.sh
sudo ./fix-airastro.sh
```

### Service démarre mais ne répond pas

```bash
# Vérification des ports et API
./debug-airastro.sh

# Recompilation si nécessaire
./build-server.sh

# Réparation complète
sudo ./fix-airastro.sh
```

### Problème de découverte réseau

```bash
# Test mDNS
./check-mdns.sh

# Reconfiguration mDNS
sudo ./configure-mdns.sh

# Test depuis un autre appareil
./test-remote-connectivity.sh airastro.local
```

### Problème de compilation

```bash
# Build complet
./build-server.sh

# Si échec, réparation complète
sudo ./fix-airastro.sh
```

### Après mise à jour système

```bash
# Mise à jour configuration
sudo ./update-mdns.sh

# Vérification complète
./status.sh
./check-mdns.sh
```

---

## 🔄 Flux de Dépannage Recommandé

1. **Aperçu rapide** : `./status.sh`
2. **Réparation rapide** : `sudo ./quick-fix.sh`
3. **Si problème persiste** : `./debug-airastro.sh`
4. **Réparation complète** : `sudo ./fix-airastro.sh`
5. **Vérification finale** : `./check-mdns.sh`

---

## 📋 Scripts par Catégorie

| Catégorie         | Script                        | Privilèges  | Durée  |
| ----------------- | ----------------------------- | ----------- | ------ |
| **Statut**        | `status.sh`                   | Utilisateur | 5s     |
| **Réparation**    | `quick-fix.sh`                | Sudo        | 30s    |
| **Diagnostic**    | `debug-airastro.sh`           | Utilisateur | 10s    |
| **Diagnostic**    | `check-mdns.sh`               | Utilisateur | 15s    |
| **Réparation**    | `fix-airastro.sh`             | Sudo        | 2-5min |
| **Build**         | `build-server.sh`             | Utilisateur | 1-3min |
| **Configuration** | `configure-mdns.sh`           | Sudo        | 1-2min |
| **Test**          | `test-remote-connectivity.sh` | Utilisateur | 15s    |

---

## 🛡️ Sécurité

- Scripts vérifient les permissions automatiquement
- Sauvegardes automatiques des configurations
- Validation des modifications avant application
- Logs détaillés de toutes les actions

---

## 📚 Logs et Documentation

- **Logs système** : `journalctl -u airastro.service -f`
- **Logs mDNS** : `journalctl -u avahi-daemon -f`
- **Documentation** : `MDNS_CONFIGURATION.md`
- **Aide détaillée** : `README.md`

Cette suite d'outils garantit une maintenance simple et efficace d'AirAstro ! 🚀
