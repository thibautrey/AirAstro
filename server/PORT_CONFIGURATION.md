# Solutions pour les problèmes de port du serveur AirAstro

## Problème

Le serveur AirAstro peut rencontrer des erreurs de permissions lors du démarrage, notamment :

- `EACCES: permission denied 0.0.0.0:80` - Permission refusée pour le port 80
- `EADDRINUSE` - Port déjà utilisé

## Solutions

### 1. Utilisation du script de démarrage intelligent (Recommandé)

```bash
# Démarrage automatique avec sélection de port
./server/scripts/start-server.sh

# Démarrage avec un port spécifique
./server/scripts/start-server.sh --port 3000

# Démarrage en avant-plan (pour debug)
./server/scripts/start-server.sh --foreground
```

### 2. Configuration manuelle de l'environnement

```bash
# Configuration automatique de l'environnement
./server/scripts/setup-environment.sh

# Configuration avec un port spécifique
./server/scripts/setup-environment.sh --port 3000
```

### 3. Script de réparation amélioré

```bash
# Le script de réparation détecte maintenant automatiquement les problèmes de port
./server/scripts/fix-airastro.sh
```

### 4. Configuration manuelle

#### Option A : Utiliser un port non-privilégié (Recommandé)

```bash
# Créer un fichier .env
echo "PORT=3000" > server/.env

# Ou définir la variable d'environnement
export PORT=3000
```

#### Option B : Autoriser les ports privilégiés pour Node.js

```bash
# Donner les permissions à Node.js pour les ports privilégiés
sudo setcap 'cap_net_bind_service=+ep' $(which node)
```

#### Option C : Utiliser un reverse proxy (Production)

```bash
# Installer nginx
sudo apt update
sudo apt install nginx

# Configurer nginx pour rediriger le port 80 vers 3000
sudo tee /etc/nginx/sites-available/airastro <<EOF
server {
    listen 80;
    server_name airastro.local;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Activer la configuration
sudo ln -s /etc/nginx/sites-available/airastro /etc/nginx/sites-enabled/
sudo systemctl restart nginx
```

## Hiérarchie des ports recommandés

1. **Port 80** : Si les permissions sont disponibles
2. **Port 3000** : Port par défaut recommandé
3. **Port 3001** : Alternative si 3000 est occupé
4. **Port 8080** : Port standard alternatif
5. **Port 8000** : Autre alternative courante

## Fichiers de configuration

### `.env`

```env
# Configuration AirAstro
NODE_ENV=production
PORT=3000

# Logs
LOG_LEVEL=info

# Sécurité
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://airastro.local,http://10.42.0.1

# mDNS
MDNS_SERVICE_NAME=airastro
MDNS_SERVICE_TYPE=http
```

### Service systemd

Le service sera automatiquement configuré avec le bon port par le script de réparation.

## Dépannage

### Vérifier les ports utilisés

```bash
# Voir tous les ports en écoute
sudo ss -tuln

# Vérifier un port spécifique
sudo ss -tuln | grep :80
```

### Vérifier les permissions

```bash
# Test de permission pour le port 80
timeout 2 nc -l 80 2>/dev/null && echo "Port 80 OK" || echo "Port 80 - Permission refusée"

# Vérifier les capabilities de Node.js
getcap $(which node)
```

### Logs du service

```bash
# Logs du service systemd
journalctl -u airastro.service -f

# Logs du script de démarrage
tail -f /var/log/airastro-start.log
```

## Migration des configurations existantes

Si vous avez une configuration existante qui utilise le port 80, les scripts s'adapteront automatiquement :

1. **Détection automatique** : Le script teste les permissions du port 80
2. **Fallback intelligent** : Si le port 80 n'est pas accessible, passage au port 3000
3. **Mise à jour des configurations** : Les fichiers de service sont automatiquement mis à jour
4. **Préservation des fonctionnalités** : mDNS et découverte réseau fonctionnent avec tous les ports

## Avantages de cette approche

- ✅ **Démarrage automatique** : Sélection intelligente du port
- ✅ **Pas de privilèges root** : Fonctionne avec un utilisateur normal
- ✅ **Compatibilité** : Fonctionne avec les configurations existantes
- ✅ **Flexibilité** : Support de multiples ports
- ✅ **Robustesse** : Gestion d'erreurs améliorée
- ✅ **Facilité d'utilisation** : Scripts automatisés
