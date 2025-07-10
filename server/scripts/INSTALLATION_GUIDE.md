# 🚀 Guide d'utilisation pendant l'installation INDI

## 📱 Situation actuelle

Votre installation INDI est en cours ! Voici ce qui se passe :

✅ **Dépendances installées** - Toutes les bibliothèques nécessaires sont en place  
✅ **Dépôt INDI configuré** - Le dépôt a été ajouté malgré l'avertissement  
🔄 **INDI Core en cours** - L'installation du cœur INDI est en cours

## 🛠️ Outils disponibles

### 1. 📺 Surveillance en temps réel

```bash
# Surveiller l'installation en cours
./monitor-indi-installation.sh
```

**Fonctionnalités :**

- Affichage en temps réel des processus
- Compteur de packages installés
- Surveillance des erreurs
- Barre de progression
- Commandes interactives (q, r, d, l, s)

### 2. 🎛️ Manager INDI complet

```bash
# Menu interactif complet
./indi-manager.sh
```

**Options disponibles :**

- Option 7 : Suivi en temps réel
- Option 6 : État actuel
- Option 1 : Diagnostic post-installation

### 3. 📊 Vérifications manuelles rapides

```bash
# Voir les packages INDI installés
dpkg -l | grep indi-

# Compter les packages installés
dpkg -l | grep indi- | wc -l

# Voir les processus actifs
ps aux | grep -E "(apt|dpkg|indi)"

# Surveiller les logs
tail -f /var/log/dpkg.log | grep indi-
```

## 🔍 Que faire maintenant ?

### ✅ Si tout se passe bien

1. **Laisser l'installation se terminer** (peut prendre 15-30 minutes)
2. **Utiliser la surveillance** : `./monitor-indi-installation.sh`
3. **Attendre** que tous les packages soient installés
4. **Vérifier** l'état final avec `./indi-manager.sh` (option 6)

### ⚠️ Si vous voyez des erreurs

1. **Ne pas interrompre** l'installation en cours
2. **Prendre note** des erreurs avec `./monitor-indi-installation.sh` (option 'l')
3. **Attendre** la fin de l'installation
4. **Diagnostiquer** avec `./indi-manager.sh` (option 1)

### 🔧 Si l'installation se bloque

1. **Vérifier les processus** : `ps aux | grep apt`
2. **Vérifier l'espace disque** : `df -h`
3. **Utiliser le monitoring** : `./monitor-indi-installation.sh`
4. **En dernier recours** : arrêter avec Ctrl+C et relancer

## 📋 Prochaines étapes prévues

Après l'installation d'INDI Core, le script va :

1. **Installer les drivers prioritaires** (ASI, QHY, Canon, Celestron...)
2. **Installer tous les drivers disponibles** (peut prendre du temps)
3. **Configurer les permissions USB**
4. **Créer le service systemd**
5. **Afficher un résumé final**

## 🎯 Commandes utiles pendant l'installation

```bash
# Surveiller en temps réel
./monitor-indi-installation.sh

# Voir l'état actuel
./indi-manager.sh
# Choisir option 6 ou 7

# Vérifier l'espace disque
df -h

# Voir les derniers packages installés
dpkg -l | grep indi- | tail -10

# Voir les processus actifs
pgrep -f "install-indi-drivers.sh"
```

## 🔧 Résolution des problèmes courants

### "Espace disque insuffisant"

```bash
# Vérifier l'espace
df -h
# Nettoyer si nécessaire
sudo apt-get clean
sudo apt-get autoremove
```

### "Installation bloquée"

```bash
# Vérifier les processus
ps aux | grep apt
# Forcer l'arrêt si nécessaire
sudo pkill -f "apt-get"
# Réparer
sudo dpkg --configure -a
```

### "Erreurs de dépendances"

```bash
# Réparer les dépendances
sudo apt-get install -f
# Puis relancer
./install-indi-drivers.sh
```

## 📞 Support

Si vous rencontrez des problèmes :

1. **Utilisez les outils de diagnostic** fournis
2. **Sauvegardez les logs** d'erreur
3. **Consultez la documentation** dans le README
4. **Utilisez le mode debug** des scripts

---

_Installation en cours... Patience ! 🚀_
