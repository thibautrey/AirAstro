#!/bin/bash

# Script intelligent pour analyser les commits et déterminer le type de version
# Utilisé par GitHub Actions pour auto-versioning intelligent

set -e

COMMIT_MSG="$1"

determine_version_type() {
    local commit_message="$1"

    # Convertir en minuscules pour la comparaison
    local msg_lower=$(echo "$commit_message" | tr '[:upper:]' '[:lower:]')

    # Vérifier pour breaking changes
    if echo "$msg_lower" | grep -E "(breaking|break:|!:|major:)" > /dev/null; then
        echo "major"
        return
    fi

    # Vérifier pour nouvelles fonctionnalités
    if echo "$msg_lower" | grep -E "(feat:|feature:|add:|new:|minor:)" > /dev/null; then
        echo "minor"
        return
    fi

    # Vérifier pour corrections de bugs
    if echo "$msg_lower" | grep -E "(fix:|bug:|patch:|hotfix:)" > /dev/null; then
        echo "patch"
        return
    fi

    # Par défaut, patch
    echo "patch"
}

should_ignore_commit() {
    local commit_message="$1"

    # Messages à ignorer
    if echo "$commit_message" | grep -E "^(docs:|chore:|ci:|test:|style:|refactor:)" > /dev/null; then
        return 0  # true - ignorer
    fi

    return 1  # false - ne pas ignorer
}

if [ -z "$COMMIT_MSG" ]; then
    echo "Usage: $0 \"commit message\""
    exit 1
fi

# Log the commit being analyzed to stderr so the script output contains only
# the resulting version type. This avoids polluting the captured output in
# GitHub Actions.
echo "Analyzing commit message: $COMMIT_MSG" >&2

if should_ignore_commit "$COMMIT_MSG"; then
    echo "IGNORE"
else
    VERSION_TYPE=$(determine_version_type "$COMMIT_MSG")
    echo "$VERSION_TYPE"
fi
