#!/bin/bash
set -e

# Script de diagnostic AirAstro - Identification des problèmes de service

log() { echo -e "\033[1;32m[AirAstro Debug]\033[0m $*"; }
warning() { echo -e "\033[1;33m[Warning]\033[0m $*"; }
error() { echo -e "\033[1;31m[Error]\033[0m $*"; }
success() { echo -e "\033[1;32m[Success]\033[0m $*"; }

log "Diagnostic complet du service AirAstro"
echo

# 1. Vérification du service systemd
log "1. État du service systemd AirAstro"
if systemctl list-units --type=service | grep -q airastro; then
    echo "✅ Service airastro trouvé dans systemd"
    
    STATUS=$(systemctl is-active airastro.service 2>/dev/null || echo "inactive")
    ENABLED=$(systemctl is-enabled airastro.service 2>/dev/null || echo "disabled")
    
    echo "   État: $STATUS"
    echo "   Activé: $ENABLED"
    
    if [ "$STATUS" != "active" ]; then
        warning "Service airastro n'est pas actif"
        echo
        echo "Logs récents du service:"
        journalctl -u airastro.service -n 10 --no-pager || echo "Pas de logs disponibles"
    fi
else
    error "❌ Service airastro non trouvé dans systemd"
    echo "   Le service n'est peut-être pas installé correctement"
fi

# 2. Vérification des fichiers de service
log "2. Vérification des fichiers de service"
SERVICE_FILE="/etc/systemd/system/airastro.service"
if [ -f "$SERVICE_FILE" ]; then
    echo "✅ Fichier de service trouvé: $SERVICE_FILE"
    echo "   Contenu:"
    cat "$SERVICE_FILE" | sed 's/^/   /'
else
    error "❌ Fichier de service manquant: $SERVICE_FILE"
fi

# 3. Vérification du répertoire de travail
log "3. Vérification du répertoire de travail"
WORK_DIR=$(grep "WorkingDirectory" "$SERVICE_FILE" 2>/dev/null | cut -d'=' -f2 || echo "Non spécifié")
if [ "$WORK_DIR" != "Non spécifié" ]; then
    echo "   Répertoire de travail: $WORK_DIR"
    if [ -d "$WORK_DIR" ]; then
        echo "✅ Répertoire de travail existe"
        
        # Vérification des fichiers nécessaires
        if [ -f "$WORK_DIR/dist/index.js" ]; then
            echo "✅ Fichier principal trouvé: $WORK_DIR/dist/index.js"
        else
            error "❌ Fichier principal manquant: $WORK_DIR/dist/index.js"
            echo "   L'application doit être compilée"
        fi
        
        if [ -f "$WORK_DIR/package.json" ]; then
            echo "✅ Package.json trouvé"
        else
            error "❌ Package.json manquant"
        fi
    else
        error "❌ Répertoire de travail n'existe pas: $WORK_DIR"
    fi
fi

# 4. Vérification de Node.js
log "4. Vérification de Node.js"
if command -v node >/dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js installé: $NODE_VERSION"
    
    # Vérification de la version minimale
    NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d'.' -f1 | tr -d 'v')
    if [ "$NODE_MAJOR" -ge 18 ]; then
        echo "✅ Version Node.js compatible (>= 18)"
    else
        warning "⚠️  Version Node.js ancienne: $NODE_VERSION (recommandé: >= 18)"
    fi
else
    error "❌ Node.js non installé"
fi

# 5. Vérification des ports
log "5. Vérification des ports"
echo "   Ports en écoute:"
if command -v ss >/dev/null; then
    ss -tuln | grep -E ":(80|3000|8080)" | sed 's/^/   /' || echo "   Aucun port HTTP trouvé"
elif command -v netstat >/dev/null; then
    netstat -tuln | grep -E ":(80|3000|8080)" | sed 's/^/   /' || echo "   Aucun port HTTP trouvé"
else
    warning "⚠️  Aucun outil de vérification des ports disponible"
fi

# 6. Processus Node.js en cours
log "6. Processus Node.js actifs"
if pgrep -f "node.*airastro\|node.*index.js" >/dev/null; then
    echo "✅ Processus Node.js AirAstro détectés:"
    ps aux | grep -E "node.*airastro|node.*index.js" | grep -v grep | sed 's/^/   /'
else
    warning "⚠️  Aucun processus Node.js AirAstro détecté"
fi

# 7. Vérification des dépendances
log "7. Vérification des dépendances"
if [ -n "$WORK_DIR" ] && [ -d "$WORK_DIR" ]; then
    if [ -d "$WORK_DIR/node_modules" ]; then
        echo "✅ Dépendances Node.js installées"
        
        # Vérification de quelques dépendances critiques
        for dep in express bonjour cors; do
            if [ -d "$WORK_DIR/node_modules/$dep" ]; then
                echo "   ✅ $dep installé"
            else
                error "   ❌ $dep manquant"
            fi
        done
    else
        error "❌ Dépendances Node.js non installées"
        echo "   Exécutez: cd $WORK_DIR && npm install"
    fi
fi

# 8. Test de démarrage manuel
log "8. Test de démarrage manuel"
if [ -n "$WORK_DIR" ] && [ -f "$WORK_DIR/dist/index.js" ]; then
    echo "   Pour tester manuellement, exécutez:"
    echo "   cd $WORK_DIR"
    echo "   node dist/index.js"
    echo
    echo "   Ou pour voir les erreurs en temps réel:"
    echo "   journalctl -u airastro.service -f"
fi

# 9. Suggestions de résolution
echo
log "🔧 Suggestions de résolution:"
echo

if [ ! -f "$WORK_DIR/dist/index.js" ]; then
    echo "1. Compiler l'application:"
    echo "   cd $WORK_DIR"
    echo "   npm run build"
    echo
fi

if [ ! -d "$WORK_DIR/node_modules" ]; then
    echo "2. Installer les dépendances:"
    echo "   cd $WORK_DIR"
    echo "   npm install"
    echo
fi

echo "3. Redémarrer le service:"
echo "   sudo systemctl restart airastro.service"
echo

echo "4. Vérifier les logs en temps réel:"
echo "   journalctl -u airastro.service -f"
echo

echo "5. Test de démarrage manuel:"
echo "   sudo systemctl stop airastro.service"
echo "   cd $WORK_DIR"
echo "   node dist/index.js"
echo

echo "6. Reconfigurer le service:"
echo "   sudo ./install-on-rpi.sh"
