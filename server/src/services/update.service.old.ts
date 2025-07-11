import { EventEmitter } from "events";
import { exec as execCallback } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { promisify } from "util";

const exec = promisify(execCallback);

const REPO_OWNER = "thibautrey";
const REPO_NAME = "AirAstro";
const INSTALL_PATH = "/opt/airastro";
const VERSIONS_PATH = `${INSTALL_PATH}/versions`;
const CURRENT_LINK = `${INSTALL_PATH}/current`;
const BACKUP_PATH = `${INSTALL_PATH}/backups`;
const LOG_FILE = `${INSTALL_PATH}/logs/update.log`;

// EventEmitter pour les notifications de progress
export const updateEmitter = new EventEmitter();

interface UpdateProgress {
  step: string;
  message: string;
  progress: number;
  details?: string;
  error?: boolean;
}

interface VersionConfig {
  currentTag: string;
  installationPath: string;
  lastUpdate: string | null;
  backupPath: string;
}

function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff) return diff;
  }
  return 0;
}

// Fonction utilitaire pour logger avec émission d'événements
function logProgress(
  step: string,
  message: string,
  progress: number,
  details?: string,
  error?: boolean
) {
  const logData: UpdateProgress = { step, message, progress, details, error };

  // Logger dans la console
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${step}] ${message}${
    details ? ` - ${details}` : ""
  }`;

  if (error) {
    console.error(logMessage);
  } else {
    console.log(logMessage);
  }

  // Émettre l'événement pour WebSocket
  updateEmitter.emit("progress", logData);

  // Écrire dans le fichier de log
  fs.appendFile(LOG_FILE, logMessage + "\n").catch((err) => {
    console.error("Erreur lors de l'écriture du log:", err);
  });
}

// Fonction pour initialiser les répertoires nécessaires
async function initializeDirectories() {
  try {
    await fs.mkdir(VERSIONS_PATH, { recursive: true });
    await fs.mkdir(BACKUP_PATH, { recursive: true });
    await fs.mkdir(path.dirname(LOG_FILE), { recursive: true });

    // Créer le fichier de log s'il n'existe pas
    try {
      await fs.access(LOG_FILE);
    } catch {
      await fs.writeFile(
        LOG_FILE,
        `AirAstro Update Log - Started: ${new Date().toISOString()}\n`
      );
    }
  } catch (error) {
    console.error("Erreur lors de l'initialisation des répertoires:", error);
    throw error;
  }
}

// Fonction pour lire la configuration de version
async function readVersionConfig(): Promise<VersionConfig> {
  try {
    const configPath = `${CURRENT_LINK}/server/config/version.json`;
    const data = await fs.readFile(configPath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    // Configuration par défaut si le fichier n'existe pas
    return {
      currentTag: "main",
      installationPath: INSTALL_PATH,
      lastUpdate: null,
      backupPath: BACKUP_PATH,
    };
  }
}

// Fonction pour écrire la configuration de version
async function writeVersionConfig(config: VersionConfig): Promise<void> {
  const configPath = `${CURRENT_LINK}/server/config/version.json`;
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}

async function getPackageVersion(): Promise<string> {
  try {
    const config = await readVersionConfig();
    return config.currentTag;
  } catch {
    // Fallback vers package.json
    const pkgPath = path.join(process.cwd(), "package.json");
    const data = await fs.readFile(pkgPath, "utf8");
    const pkg = JSON.parse(data);
    return pkg.version as string;
  }
}

export async function checkForUpdate() {
  const current = await getPackageVersion();
  const res = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`,
    {
      headers: { "User-Agent": "AirAstro-Server" },
    }
  );
  if (!res.ok) {
    throw new Error(`GitHub API responded with ${res.status}`);
  }
  const release = (await res.json()) as any;
  const latest = (release.tag_name as string).replace(/^v/, "");
  const updateAvailable = compareVersions(current, latest) < 0;
  return {
    updateAvailable,
    latestVersion: latest,
    currentVersion: current,
    tarballUrl: release.tarball_url as string,
  };
}

export async function downloadUpdate(): Promise<string> {
  await initializeDirectories();
  logProgress("download", "Vérification des mises à jour disponibles", 5);

  const info = await checkForUpdate();
  if (!info.updateAvailable) {
    logProgress("download", "Aucune mise à jour disponible", 100);
    return "";
  }

  logProgress(
    "download",
    `Nouvelle version disponible: ${info.latestVersion}`,
    10
  );

  const versionDir = path.join(VERSIONS_PATH, info.latestVersion);
  const archivePath = path.join(
    versionDir,
    `release-${info.latestVersion}.tar.gz`
  );

  // Créer le répertoire de version
  await fs.mkdir(versionDir, { recursive: true });

  logProgress("download", "Téléchargement de l'archive...", 20);

  const res = await fetch(info.tarballUrl, {
    headers: { "User-Agent": "AirAstro-Server" },
  });

  if (!res.ok || !res.body) {
    throw new Error("Échec du téléchargement de la mise à jour");
  }

  logProgress("download", "Téléchargement en cours...", 50);

  // Convert Web ReadableStream to Buffer
  const arrayBuffer = await res.arrayBuffer();
  await fs.writeFile(archivePath, Buffer.from(arrayBuffer));

  logProgress("download", "Téléchargement terminé", 100);

  return archivePath;
}

export async function installUpdate(archivePath: string): Promise<void> {
  await initializeDirectories();
  logProgress('install', 'Démarrage de l\'installation', 5);

  const info = await checkForUpdate();
  const version = info.latestVersion;
  const versionDir = path.join(VERSIONS_PATH, version);
  const extractDir = path.join(versionDir, 'extracted');
  const backupDir = path.join(BACKUP_PATH, `backup-${Date.now()}`);

  logProgress('install', `Installation de la version ${version}`, 10);

  try {
    // 1. Préparer les répertoires
    await fs.rm(extractDir, { recursive: true, force: true });
    await fs.mkdir(extractDir, { recursive: true });
    await fs.mkdir(backupDir, { recursive: true });

    logProgress('install', 'Extraction de l\'archive...', 20);

    // 2. Extraire l'archive
    await exec(`tar -xzf ${archivePath} -C ${extractDir}`);

    const dirs = await fs.readdir(extractDir);
    if (dirs.length === 0) throw new Error("Extraction failed");

    const extractedRepoDir = path.join(extractDir, dirs[0]);

    logProgress('install', 'Copie des fichiers...', 30);

    // 3. Copier tout le contenu vers le répertoire de version
    await fs.cp(extractedRepoDir, versionDir, {
      recursive: true,
      filter: (source) => !source.includes('extracted')
    });

    logProgress('install', 'Installation des dépendances serveur...', 40);

    // 4. Installer les dépendances et builder le serveur
    await exec(`cd ${path.join(versionDir, "server")} && npm install`);

    logProgress('install', 'Compilation du serveur...', 60);

    await exec(`cd ${path.join(versionDir, "server")} && npm run build`);

    // 5. Installer et builder l'app web si elle existe
    const webAppPath = path.join(versionDir, "apps", "web");
    try {
      await fs.access(webAppPath);

      logProgress('install', 'Installation des dépendances web...', 70);

      await exec(`cd ${webAppPath} && npm install`);

      logProgress('install', 'Compilation de l\'application web...', 80);

      await exec(`cd ${webAppPath} && npm run build`);

      // Nettoyer les node_modules pour économiser l'espace
      await fs.rm(path.join(webAppPath, "node_modules"), { recursive: true, force: true });

      logProgress('install', 'Nettoyage des fichiers temporaires...', 85);

    } catch {
      logProgress('install', 'Aucune application web trouvée, passage à l\'étape suivante', 80);
    }

    // 6. Création du backup de la version actuelle
    try {
      const currentExists = await fs.access(CURRENT_LINK).then(() => true).catch(() => false);
      if (currentExists) {
        logProgress('install', 'Création du backup...', 90);

        await fs.cp(CURRENT_LINK, backupDir, {
          recursive: true,
          filter: (source) => {
            const relativePath = path.relative(CURRENT_LINK, source);
            return !relativePath.startsWith('logs') &&
                   !relativePath.startsWith('node_modules') &&
                   !relativePath.includes('.git');
          }
        });
      }
    } catch (error) {
      logProgress('install', 'Erreur lors de la création du backup', 90, error.message, true);
    }

    // 7. Mise à jour de la configuration de version
    const newConfig: VersionConfig = {
      currentTag: version,
      installationPath: INSTALL_PATH,
      lastUpdate: new Date().toISOString(),
      backupPath: BACKUP_PATH
    };

    await fs.writeFile(
      path.join(versionDir, 'server/config/version.json'),
      JSON.stringify(newConfig, null, 2)
    );

    logProgress('install', 'Mise à jour du lien symbolique...', 95);

    // 8. Switch atomique vers la nouvelle version
    await exec(`rm -f ${CURRENT_LINK}`);
    await exec(`ln -sf ${versionDir} ${CURRENT_LINK}`);

    // 9. Nettoyer les anciens backups (garder seulement les 5 derniers)
    try {
      const backups = await fs.readdir(BACKUP_PATH);
      const backupDirs = backups
        .filter(name => name.startsWith('backup-'))
        .sort()
        .slice(0, -5); // Garder les 5 plus récents

      for (const oldBackup of backupDirs) {
        await fs.rm(path.join(BACKUP_PATH, oldBackup), { recursive: true, force: true });
      }
    } catch (error) {
      logProgress('install', 'Erreur lors du nettoyage des backups', 98, error.message, true);
    }

    logProgress('install', 'Installation terminée avec succès !', 100);

    // Programmer le redémarrage du service
    setTimeout(async () => {
      try {
        await exec('sudo systemctl restart airastro.service');
        logProgress('install', 'Service redémarré avec succès', 100);
      } catch (error) {
        logProgress('install', 'Erreur lors du redémarrage du service', 100, error.message, true);
      }
    }, 2000);

  } catch (error) {
    logProgress('install', 'Erreur lors de l\'installation', 0, error.message, true);

    // Nettoyer en cas d'erreur
    await fs.rm(extractDir, { recursive: true, force: true }).catch(() => {});
    await fs.rm(backupDir, { recursive: true, force: true }).catch(() => {});

    throw error;
  }
}
  const updatesDir = path.join(process.cwd(), "updates");
  const extractDir = path.join(updatesDir, "extracted");
  const newVersionDir = path.join(updatesDir, `airastro-${version}`);
  const currentDir = process.cwd();
  const backupDir = path.join(updatesDir, `backup-${Date.now()}`);

  console.log(`[UPDATE] Starting installation of version ${version}`);
  console.log(`[UPDATE] Current directory: ${currentDir}`);
  console.log(`[UPDATE] New version directory: ${newVersionDir}`);
  console.log(`[UPDATE] Backup directory: ${backupDir}`);

  try {
    // 1. Nettoyer et créer les répertoires
    await fs.rm(extractDir, { recursive: true, force: true });
    await fs.rm(newVersionDir, { recursive: true, force: true });
    await fs.mkdir(extractDir, { recursive: true });
    await fs.mkdir(newVersionDir, { recursive: true });

    console.log(`[UPDATE] Extracting archive...`);
    // 2. Extraire l'archive
    await exec(`tar -xzf ${archivePath} -C ${extractDir}`);

    const dirs = await fs.readdir(extractDir);
    if (dirs.length === 0) throw new Error("Extraction failed");

    const extractedRepoDir = path.join(extractDir, dirs[0]);
    console.log(`[UPDATE] Extracted to: ${extractedRepoDir}`);

    // 3. Copier tout le contenu du repo vers le nouveau répertoire
    await fs.cp(extractedRepoDir, newVersionDir, { recursive: true });
    console.log(`[UPDATE] Copied repository to new version directory`);

    // 4. Installer les dépendances et builder le serveur
    console.log(`[UPDATE] Installing server dependencies...`);
    await exec(`cd ${path.join(newVersionDir, "server")} && npm install`);

    console.log(`[UPDATE] Building server...`);
    await exec(`cd ${path.join(newVersionDir, "server")} && npm run build`);

    // 5. Installer et builder l'app web si elle existe
    const webAppPath = path.join(newVersionDir, "apps", "web");
    try {
      await fs.access(webAppPath);
      console.log(`[UPDATE] Installing web app dependencies...`);
      await exec(`cd ${webAppPath} && npm install`);

      console.log(`[UPDATE] Building web app...`);
      await exec(`cd ${webAppPath} && npm run build`);

      // Nettoyer les node_modules pour économiser l'espace
      await fs.rm(path.join(webAppPath, "node_modules"), {
        recursive: true,
        force: true,
      });
      console.log(`[UPDATE] Cleaned web app node_modules`);
    } catch {
      console.log(`[UPDATE] No web app found, skipping web build`);
    }

    // 6. Créer le backup de la version actuelle
    console.log(`[UPDATE] Creating backup of current version...`);
    await fs.cp(currentDir, backupDir, {
      recursive: true,
      filter: (source) => {
        // Exclure les répertoires temporaires du backup
        const relativePath = path.relative(currentDir, source);
        return (
          !relativePath.startsWith("updates") &&
          !relativePath.startsWith("node_modules") &&
          !relativePath.includes(".git")
        );
      },
    });

    console.log(`[UPDATE] Backup created successfully`);

    // 7. Préparer le script de switch
    const switchScript = `#!/bin/bash
set -e

echo "[UPDATE] Performing atomic switch to new version..."

# Sauvegarder les fichiers de configuration qui doivent être préservés
TEMP_CONFIG_DIR="/tmp/airastro-config-backup"
mkdir -p "$TEMP_CONFIG_DIR"

# Sauvegarder la configuration des équipements si elle existe
if [ -f "${currentDir}/server/config/equipment.env" ]; then
    cp "${currentDir}/server/config/equipment.env" "$TEMP_CONFIG_DIR/"
fi

# Arrêter les services actuels
echo "[UPDATE] Stopping current services..."
pkill -f "node.*airastro" || true
sleep 2

# Effectuer le switch atomique
echo "[UPDATE] Switching to new version..."
cd "${path.dirname(currentDir)}"
mv "${currentDir}" "${currentDir}_old"
mv "${newVersionDir}" "${currentDir}"

# Restaurer la configuration
if [ -f "$TEMP_CONFIG_DIR/equipment.env" ]; then
    cp "$TEMP_CONFIG_DIR/equipment.env" "${currentDir}/server/config/"
fi

# Nettoyer
rm -rf "$TEMP_CONFIG_DIR"

echo "[UPDATE] Switch completed successfully"
echo "[UPDATE] Restarting services..."

# Redémarrer le serveur
cd "${currentDir}/server"
npm start > /dev/null 2>&1 &

echo "[UPDATE] Update installation completed successfully"
`;

    const switchScriptPath = path.join(updatesDir, "switch.sh");
    await fs.writeFile(switchScriptPath, switchScript);
    await fs.chmod(switchScriptPath, 0o755);

    console.log(`[UPDATE] Switch script created: ${switchScriptPath}`);

    // 8. Programmer l'exécution du script de switch
    // On utilise un délai pour permettre à la réponse HTTP d'être envoyée
    setTimeout(async () => {
      try {
        console.log(`[UPDATE] Executing switch script...`);
        await exec(`bash ${switchScriptPath}`);

        // Nettoyer les anciens backups (garder seulement les 3 derniers)
        const backups = await fs.readdir(updatesDir);
        const backupDirs = backups
          .filter((name) => name.startsWith("backup-"))
          .sort()
          .slice(0, -3); // Garder les 3 plus récents

        for (const oldBackup of backupDirs) {
          await fs.rm(path.join(updatesDir, oldBackup), {
            recursive: true,
            force: true,
          });
        }

        console.log(`[UPDATE] Installation completed successfully`);
      } catch (error) {
        console.error(`[UPDATE] Switch failed, attempting rollback...`, error);
        // En cas d'échec, tenter un rollback
        try {
          await exec(
            `cd ${path.dirname(
              currentDir
            )} && mv ${currentDir} ${currentDir}_failed && mv ${currentDir}_old ${currentDir}`
          );
          console.log(`[UPDATE] Rollback completed`);
        } catch (rollbackError) {
          console.error(`[UPDATE] Rollback failed:`, rollbackError);
        }
      }
    }, 2000); // Délai de 2 secondes

    console.log(
      `[UPDATE] Installation process initiated, switch will occur in 2 seconds`
    );
  } catch (error) {
    console.error(`[UPDATE] Installation failed:`, error);

    // Nettoyer en cas d'erreur
    await fs.rm(extractDir, { recursive: true, force: true }).catch(() => {});
    await fs
      .rm(newVersionDir, { recursive: true, force: true })
      .catch(() => {});
    await fs.rm(backupDir, { recursive: true, force: true }).catch(() => {});

    throw error;
  }
}

export async function rollbackUpdate(): Promise<void> {
  const updatesDir = path.join(process.cwd(), "updates");
  const currentDir = process.cwd();

  // Chercher le backup le plus récent
  const backups = await fs.readdir(updatesDir);
  const backupDirs = backups
    .filter((name) => name.startsWith("backup-"))
    .sort()
    .reverse(); // Plus récent en premier

  if (backupDirs.length === 0) {
    throw new Error("No backup found for rollback");
  }

  const latestBackup = backupDirs[0];
  const backupPath = path.join(updatesDir, latestBackup);

  console.log(`[ROLLBACK] Rolling back to backup: ${latestBackup}`);

  const rollbackScript = `#!/bin/bash
set -e

echo "[ROLLBACK] Starting rollback process..."

# Arrêter les services actuels
echo "[ROLLBACK] Stopping current services..."
pkill -f "node.*airastro" || true
sleep 2

# Effectuer le rollback
echo "[ROLLBACK] Restoring from backup..."
cd "${path.dirname(currentDir)}"
mv "${currentDir}" "${currentDir}_failed_$(date +%s)"
cp -r "${backupPath}" "${currentDir}"

echo "[ROLLBACK] Restarting services..."
cd "${currentDir}/server"
npm start > /dev/null 2>&1 &

echo "[ROLLBACK] Rollback completed successfully"
`;

  const rollbackScriptPath = path.join(updatesDir, "rollback.sh");
  await fs.writeFile(rollbackScriptPath, rollbackScript);
  await fs.chmod(rollbackScriptPath, 0o755);

  // Exécuter le rollback après un délai
  setTimeout(async () => {
    try {
      await exec(`bash ${rollbackScriptPath}`);
      console.log(`[ROLLBACK] Rollback completed successfully`);
    } catch (error) {
      console.error(`[ROLLBACK] Rollback failed:`, error);
    }
  }, 1000);
}

export async function listBackups(): Promise<string[]> {
  const updatesDir = path.join(process.cwd(), "updates");

  try {
    const backups = await fs.readdir(updatesDir);
    return backups
      .filter((name) => name.startsWith("backup-"))
      .sort()
      .reverse(); // Plus récent en premier
  } catch {
    return [];
  }
}
