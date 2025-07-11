#!/bin/bash

# Script d'installation/mise à jour de la base de données d'équipements AirAstro
# Ce script s'exécute lors de l'installation ou de la mise à jour du système

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="/tmp/airastro-db-setup.log"
SYSTEMD_SERVICE_FILE="/etc/systemd/system/airastro-db-update.service"
SYSTEMD_TIMER_FILE="/etc/systemd/system/airastro-db-update.timer"

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Fonctions utilitaires
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

# Fonction pour vérifier la connexion Internet
check_internet() {
    if curl -s --head --connect-timeout 10 https://api.github.com > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Fonction pour initialiser la base de données
initialize_database() {
    log_info "Initialisation de la base de données d'équipements..."
    
    # Créer le répertoire de données s'il n'existe pas
    mkdir -p "$PROJECT_ROOT/server/src/data"
    
    # Vérifier si Node.js est installé
    if ! command -v node &> /dev/null; then
        log_error "Node.js n'est pas installé. Veuillez l'installer d'abord."
        exit 1
    fi
    
    # Vérifier si les dépendances sont installées
    if [ ! -d "$PROJECT_ROOT/server/node_modules" ]; then
        log_info "Installation des dépendances Node.js..."
        cd "$PROJECT_ROOT/server"
        npm install
    fi
    
    # Exécuter le script d'initialisation
    cd "$PROJECT_ROOT/server"
    
    if check_internet; then
        log_info "Connexion Internet détectée, téléchargement de la base de données complète..."
        node -e "
        const { EquipmentDatabaseService } = require('./src/services/equipment-database.service');
        const service = new EquipmentDatabaseService();
        service.initializeDatabase().then(() => {
            const stats = service.getStatistics();
            console.log('✅ Base de données initialisée:');
            console.log('  - Équipements totaux:', stats.totalEquipment);
            console.log('  - Par type:', JSON.stringify(stats.byType, null, 2));
            console.log('  - Par fabricant:', Object.keys(stats.byManufacturer).length, 'fabricants');
            console.log('  - Dernière mise à jour:', stats.lastUpdate);
        }).catch(error => {
            console.error('❌ Erreur lors de l\\'initialisation:', error);
            process.exit(1);
        });
        "
    else
        log_warning "Pas de connexion Internet, utilisation de la base de données par défaut"
        node -e "
        const { EquipmentDatabaseService } = require('./src/services/equipment-database.service');
        const service = new EquipmentDatabaseService();
        service.initializeDatabase().then(() => {
            console.log('✅ Base de données par défaut initialisée');
        }).catch(error => {
            console.error('❌ Erreur lors de l\\'initialisation:', error);
            process.exit(1);
        });
        "
    fi
}

# Fonction pour créer le service systemd de mise à jour automatique
create_systemd_service() {
    log_info "Création du service systemd pour les mises à jour automatiques..."
    
    # Créer le service systemd
    cat > "$SYSTEMD_SERVICE_FILE" << EOF
[Unit]
Description=AirAstro Equipment Database Update Service
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
User=pi
Group=pi
WorkingDirectory=$PROJECT_ROOT/server
Environment=NODE_ENV=production
ExecStart=/usr/bin/node -e "const { EquipmentDatabaseService } = require('./src/services/equipment-database.service'); const service = new EquipmentDatabaseService(); service.forceUpdate().then(() => console.log('✅ Base de données mise à jour')).catch(error => console.error('❌ Erreur:', error));"
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    # Créer le timer systemd (mise à jour quotidienne)
    cat > "$SYSTEMD_TIMER_FILE" << EOF
[Unit]
Description=Update AirAstro Equipment Database Daily
Requires=airastro-db-update.service

[Timer]
OnCalendar=daily
Persistent=true
RandomizedDelaySec=3600

[Install]
WantedBy=timers.target
EOF

    # Recharger systemd et activer le timer
    systemctl daemon-reload
    systemctl enable airastro-db-update.timer
    systemctl start airastro-db-update.timer
    
    log_success "Service systemd créé et activé pour les mises à jour quotidiennes"
}

# Fonction pour créer un script de mise à jour manuelle
create_manual_update_script() {
    log_info "Création du script de mise à jour manuelle..."
    
    cat > "$PROJECT_ROOT/server/scripts/update-equipment-database.sh" << 'EOF'
#!/bin/bash

# Script de mise à jour manuelle de la base de données d'équipements

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🔄 Mise à jour de la base de données d'équipements AirAstro..."

cd "$PROJECT_ROOT"

# Vérifier la connexion Internet
if ! curl -s --head --connect-timeout 10 https://api.github.com > /dev/null 2>&1; then
    echo "❌ Pas de connexion Internet disponible"
    exit 1
fi

# Exécuter la mise à jour
node -e "
const { EquipmentDatabaseService } = require('./src/services/equipment-database.service');
const service = new EquipmentDatabaseService();
service.forceUpdate().then(() => {
    const stats = service.getStatistics();
    console.log('✅ Base de données mise à jour:');
    console.log('  - Équipements totaux:', stats.totalEquipment);
    console.log('  - Dernière mise à jour:', stats.lastUpdate);
}).catch(error => {
    console.error('❌ Erreur lors de la mise à jour:', error);
    process.exit(1);
});
"

echo "✅ Mise à jour terminée"
EOF

    chmod +x "$PROJECT_ROOT/server/scripts/update-equipment-database.sh"
    
    log_success "Script de mise à jour manuelle créé dans server/scripts/update-equipment-database.sh"
}

# Fonction principale
main() {
    log_info "=== Installation/Mise à jour de la base de données d'équipements AirAstro ==="
    log_info "Timestamp: $(date)"
    log_info "Utilisateur: $(whoami)"
    log_info "Répertoire: $PROJECT_ROOT"
    
    # Initialiser la base de données
    initialize_database
    
    # Créer les scripts et services seulement si on est root
    if [[ $EUID -eq 0 ]]; then
        create_systemd_service
        create_manual_update_script
    else
        log_warning "Pas de privilèges root, services systemd non créés"
        create_manual_update_script
    fi
    
    log_success "🎉 Installation terminée avec succès!"
    log_info "📋 Prochaines étapes:"
    log_info "  - La base de données sera mise à jour automatiquement chaque jour"
    log_info "  - Utilisez server/scripts/update-equipment-database.sh pour une mise à jour manuelle"
    log_info "  - Consultez les logs dans $LOG_FILE"
}

# Vérifier les arguments
if [[ "$1" == "--help" ]] || [[ "$1" == "-h" ]]; then
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Afficher cette aide"
    echo "  --force        Forcer la mise à jour même si la base est récente"
    echo "  --offline      Mode offline (ne pas télécharger depuis Internet)"
    echo ""
    echo "Ce script initialise la base de données d'équipements AirAstro"
    echo "et configure les mises à jour automatiques."
    exit 0
fi

# Exécuter le script principal
main "$@"
