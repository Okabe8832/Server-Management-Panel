import { invoke } from "@tauri-apps/api/core";
import type { AppStatePayload } from "../types/tauri";
import type { VaultData } from "../types/vault";

export async function initializeApp(): Promise<AppStatePayload> {
  return invoke<AppStatePayload>("initialize_app");
}

export async function saveVault(vault: VaultData): Promise<VaultData> {
  return invoke<VaultData>("save_vault", { vault });
}

export async function backupVault(): Promise<string> {
  return invoke<string>("backup_vault");
}
