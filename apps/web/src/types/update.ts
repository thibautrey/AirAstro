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
  message: string;
  version: string;
  status: string;
}

export interface UpdateRollbackResponse {
  message: string;
  backup: string;
  status: string;
}

export interface UpdateBackupsResponse {
  backups: string[];
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

export interface UpdateProgress {
  step: string;
  message: string;
  progress: number;
  details?: string;
  error?: boolean;
}

export interface UpdateLogsResponse {
  logs: string;
}

export interface RebootResponse {
  message: string;
  status: string;
}
