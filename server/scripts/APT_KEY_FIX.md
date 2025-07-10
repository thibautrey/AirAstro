# 🔧 Résolution du problème apt-key INDI

## Problème rencontré

Vous avez rencontré l'erreur suivante lors de l'installation des drivers INDI :

```
Warning: apt-key is deprecated. Manage keyring files in trusted.gpg.d instead (see apt-key(8)).
gpg: no valid OpenPGP data found.
```

## Solutions disponibles

### ✅ Solution rapide (recommandée)

Exécutez directement le script de correction :

```bash
cd /home/pi/AirAstro/server/scripts
./quick-fix-apt-key.sh
```

Ce script :

- ✅ Corrige automatiquement le problème apt-key
- ✅ Utilise les nouvelles méthodes sécurisées de gestion des clés GPG
- ✅ Configure correctement le dépôt INDI
- ✅ Teste l'installation d'un package

### 🛠️ Solution complète avec menu interactif

Utilisez le manager INDI pour une gestion complète :

```bash
cd /home/pi/AirAstro/server/scripts
./indi-manager.sh
```

Le manager propose :

- 🔍 Diagnostic complet du système
- 🔧 Réparation automatique
- 🧹 Nettoyage complet si nécessaire
- 📦 Installation des drivers
- 📊 Surveillance de l'état

### 🧰 Solutions manuelles

Si vous préférez une approche étape par étape :

1. **Diagnostic** :

   ```bash
   ./diagnose-indi-system.sh
   ```

2. **Réparation** :

   ```bash
   ./fix-indi-repository.sh
   ```

3. **Nettoyage complet** (si nécessaire) :

   ```bash
   ./clean-indi-system.sh
   ```

4. **Installation des drivers** :
   ```bash
   ./install-indi-drivers.sh
   ```

## Explication technique

### Le problème

L'ancienne méthode d'ajout de clés GPG avec `apt-key` est dépréciée depuis Ubuntu 20.04 et ne fonctionne plus correctement. Le script original utilisait :

```bash
wget -qO - https://www.indilib.org/jdownloads/Ubuntu/indilib.gpg | sudo apt-key add -
```

### La solution

La nouvelle méthode utilise le répertoire `/etc/apt/keyrings/` et spécifie la clé dans le fichier de dépôt :

```bash
# Télécharger la clé
wget -qO - https://www.indilib.org/jdownloads/Ubuntu/indilib.gpg | sudo gpg --dearmor -o /etc/apt/keyrings/indilib.gpg

# Ajouter le dépôt avec la clé spécifiée
echo "deb [signed-by=/etc/apt/keyrings/indilib.gpg] https://ppa.launchpadcontent.net/mutlaqja/ppa/ubuntu/ focal main" | sudo tee /etc/apt/sources.list.d/indi.list
```

## Vérification

Après avoir appliqué la solution, vérifiez que tout fonctionne :

```bash
# Vérifier les packages INDI disponibles
apt-cache search "^indi-" | wc -l

# Vérifier l'installation d'un package de test
sudo apt-get install -y indi-bin

# Vérifier que indiserver est disponible
which indiserver
```

## Scripts créés

| Script                    | Description                                          |
| ------------------------- | ---------------------------------------------------- |
| `quick-fix-apt-key.sh`    | **Correction rapide** du problème apt-key            |
| `indi-manager.sh`         | **Menu interactif** pour gérer tous les aspects INDI |
| `diagnose-indi-system.sh` | **Diagnostic complet** du système                    |
| `fix-indi-repository.sh`  | **Réparation** du dépôt INDI                         |
| `clean-indi-system.sh`    | **Nettoyage complet** du système                     |
| `install-indi-drivers.sh` | **Installation** des drivers (mis à jour)            |

## Après la correction

Une fois le problème résolu, vous pouvez :

1. **Continuer l'installation** des drivers INDI
2. **Configurer les permissions** USB pour vos appareils
3. **Démarrer le service** INDI
4. **Tester la connexion** avec vos équipements astronomiques

## Support

Si vous rencontrez encore des problèmes :

1. Exécutez le diagnostic complet : `./diagnose-indi-system.sh`
2. Consultez les logs détaillés affichés par les scripts
3. Vérifiez la connectivité réseau
4. Essayez le nettoyage complet si nécessaire

---

_Cette documentation a été générée automatiquement lors de la résolution du problème apt-key._
