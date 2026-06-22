import { invoke } from "@tauri-apps/api/core";
import type { Settings } from "../types/settings";

export async function saveSettings(settings: Settings): Promise<Settings> {
  return invoke<Settings>("save_settings", { settings });
}
