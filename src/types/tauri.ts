import type { Settings } from "./settings";
import type { VaultData } from "./vault";

export interface AppStatePayload {
  vault: VaultData;
  settings: Settings;
  dataDir: string;
  warnings: string[];
}

export interface ImportResultPayload {
  vault: VaultData;
  backupPath: string;
}

export interface LaunchResultPayload {
  success: boolean;
  message: string;
  attemptedPath: string;
}
