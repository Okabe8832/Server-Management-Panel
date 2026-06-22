import { invoke } from "@tauri-apps/api/core";
import type { LaunchResultPayload } from "../types/tauri";
import type { Host } from "../types/vault";

export async function openSshTerminal(host: Host): Promise<LaunchResultPayload> {
  return invoke<LaunchResultPayload>("open_ssh_terminal", {
    address: host.address,
    port: host.port,
    username: host.username,
  });
}
