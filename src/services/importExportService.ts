import { open, save } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import type { ImportResultPayload } from "../types/tauri";
import type { VaultData } from "../types/vault";
import { compactTimestamp } from "../utils/date";
import { validateVaultData } from "../utils/validation";

export async function exportVault(vault: VaultData): Promise<string | null> {
  validateVaultData(vault);
  const filePath = await save({
    title: "导出服务器 JSON",
    defaultPath: `server-vault-${compactTimestamp()}.json`,
    filters: [{ name: "JSON", extensions: ["json"] }],
  });
  if (!filePath) return null;
  await invoke("export_vault_to_path", { vault, path: filePath });
  return filePath;
}

export async function selectImportFile(): Promise<string | null> {
  const selected = await open({
    title: "导入服务器 JSON",
    multiple: false,
    filters: [{ name: "JSON", extensions: ["json"] }],
  });
  return !selected || Array.isArray(selected) ? null : selected;
}

export async function importVaultFromPath(path: string, currentRevision: number): Promise<ImportResultPayload> {
  return invoke<ImportResultPayload>("import_vault_from_path", {
    path,
    currentRevision,
  });
}
