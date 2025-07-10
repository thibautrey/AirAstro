export interface UpdateInfo {
  updateAvailable: boolean;
  latestVersion: string;
  currentVersion: string;
  tarballUrl: string;
}

export interface UpdateDownloadResponse {
  archive?: string;
  message?: string;
}

export interface UpdateInstallResponse {
  installed: string;
}

export interface UpdateError {
  error: string;
}

export enum UpdateStatus {
  IDLE = "idle",
  CHECKING = "checking",
  AVAILABLE = "available",
  DOWNLOADING = "downloading",
  INSTALLING = "installing",
  COMPLETED = "completed",
  ERROR = "error",
}
