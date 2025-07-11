#!/bin/bash

# Script de test pour vérifier le filtrage des équipements

echo "🧪 Test du filtrage des équipements AirAstro"
echo "=============================================="

# Configuration du serveur
SERVER_URL="http://localhost:3000"
if [ ! -z "$1" ]; then
    SERVER_URL="$1"
fi

echo "📡 Serveur: $SERVER_URL"

# Test 1: Récupération des équipements filtrés (par défaut)
echo
echo "🔍 Test 1: Équipements filtrés (par défaut)"
echo "-------------------------------------------"
curl -s "$SERVER_URL/api/equipment" | jq '.equipment | length' | sed 's/^/Nombre d'\''équipements: /'

# Test 2: Récupération de tous les équipements
echo
echo "🔍 Test 2: Tous les équipements (includeUnknown=true)"
echo "----------------------------------------------------"
curl -s "$SERVER_URL/api/equipment?includeUnknown=true" | jq '.equipment | length' | sed 's/^/Nombre d'\''équipements: /'

# Test 3: Comparaison des résultats
echo
echo "🔍 Test 3: Analyse des types d'équipements"
echo "------------------------------------------"

echo "Types d'équipements (filtrés):"
curl -s "$SERVER_URL/api/equipment" | jq -r '.equipment[] | .type' | sort | uniq -c

echo
echo "Types d'équipements (tous):"
curl -s "$SERVER_URL/api/equipment?includeUnknown=true" | jq -r '.equipment[] | .type' | sort | uniq -c

# Test 4: Vérification des scores de confiance
echo
echo "🔍 Test 4: Scores de confiance"
echo "------------------------------"

echo "Scores de confiance (filtrés):"
curl -s "$SERVER_URL/api/equipment" | jq -r '.equipment[] | "\(.confidence) - \(.name)"' | sort -n

echo
echo "Scores de confiance (tous):"
curl -s "$SERVER_URL/api/equipment?includeUnknown=true" | jq -r '.equipment[] | "\(.confidence) - \(.name)"' | sort -n

# Test 5: Vérification du filtrage des équipements inconnus
echo
echo "🔍 Test 5: Équipements inconnus filtrés"
echo "--------------------------------------"

FILTERED_UNKNOWN=$(curl -s "$SERVER_URL/api/equipment" | jq '.equipment[] | select(.type == "unknown" and .confidence < 50) | .name' | wc -l)
ALL_UNKNOWN=$(curl -s "$SERVER_URL/api/equipment?includeUnknown=true" | jq '.equipment[] | select(.type == "unknown" and .confidence < 50) | .name' | wc -l)

echo "Équipements inconnus (confiance < 50) filtrés: $FILTERED_UNKNOWN"
echo "Équipements inconnus (confiance < 50) total: $ALL_UNKNOWN"

if [ "$FILTERED_UNKNOWN" -eq 0 ] && [ "$ALL_UNKNOWN" -gt 0 ]; then
    echo "✅ Filtrage fonctionnel: $ALL_UNKNOWN équipements inconnus filtrés"
else
    echo "❌ Problème de filtrage détecté"
fi

echo
echo "🎉 Tests terminés"
