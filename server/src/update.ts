import { exec as execCallback } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { promisify } from "util";

const exec = promisify(execCallback);

const REPO_OWNER = "thibautrey";
const REPO_NAME = "AirAstro";

function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff) return diff;
  }
  return 0;
}

async function getPackageVersion(): Promise<string> {
  const pkgPath = path.join(process.cwd(), "package.json");
  const data = await fs.readFile(pkgPath, "utf8");
  const pkg = JSON.parse(data);
  return pkg.version as string;
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
  const info = await checkForUpdate();
  if (!info.updateAvailable) return "";
  await fs.mkdir("updates", { recursive: true });
  const archivePath = path.join(
    "updates",
    `release-${info.latestVersion}.tar.gz`
  );
  const res = await fetch(info.tarballUrl, {
    headers: { "User-Agent": "AirAstro-Server" },
  });
  if (!res.ok || !res.body) {
    throw new Error("Failed to download update");
  }

  // Convert Web ReadableStream to Buffer
  const arrayBuffer = await res.arrayBuffer();
  await fs.writeFile(archivePath, Buffer.from(arrayBuffer));

  return archivePath;
}

export async function installUpdate(archivePath: string) {
  const extractDir = path.join("updates", "extracted");
  await fs.rm(extractDir, { recursive: true, force: true });
  await fs.mkdir(extractDir, { recursive: true });
  await exec(`tar -xzf ${archivePath} -C ${extractDir}`);
  const dirs = await fs.readdir(extractDir);
  if (dirs.length === 0) throw new Error("Extraction failed");
  const newServerPath = path.join(extractDir, dirs[0], "server");
  const backupDir = `server_backup_${Date.now()}`;
  await fs.cp("server", backupDir, { recursive: true });
  try {
    await fs.rm("server", { recursive: true, force: true });
    await fs.cp(newServerPath, "server", { recursive: true });
    await exec("cd server && npm install && npm run build");
  } catch (err) {
    await fs.rm("server", { recursive: true, force: true }).catch(() => {});
    await fs.cp(backupDir, "server", { recursive: true });
    throw err;
  }
}
