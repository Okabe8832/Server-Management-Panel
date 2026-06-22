import type { Host, HostDraft, VaultData } from "../types/vault";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function cleanTags(value: string | string[]): string[] {
  const tags = Array.isArray(value) ? value : value.split(",");
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
}

export function validateHostDraft(host: HostDraft): ValidationResult {
  const errors: string[] = [];
  if (!host.name.trim()) errors.push("服务器名称必填。");
  if (!host.address.trim()) errors.push("IP / 地址必填。");
  if (!Number.isInteger(host.port) || host.port < 1 || host.port > 65535) {
    errors.push("端口必须是 1 到 65535 的整数。");
  }
  return { valid: errors.length === 0, errors };
}

export function validateHost(host: Host): ValidationResult {
  const base = validateHostDraft(host);
  const errors = [...base.errors];
  if (!host.id.trim()) errors.push("服务器 id 不能为空。");
  if (!host.createdAt || !host.updatedAt) errors.push("服务器时间字段缺失。");
  return { valid: errors.length === 0, errors };
}

export function normalizeHostDraft(draft: HostDraft): HostDraft {
  return {
    name: draft.name.trim(),
    address: draft.address.trim(),
    port: Number(draft.port),
    username: draft.username.trim(),
    password: draft.password,
    group: draft.group.trim(),
    tags: cleanTags(draft.tags),
    note: draft.note.trim(),
  };
}

export function validateVaultData(value: unknown): asserts value is VaultData {
  const data = value as Partial<VaultData>;
  if (!data || typeof data !== "object") throw new Error("JSON 顶层必须是对象。");
  if (data.schema !== 2) throw new Error("schema 必须为 2。");
  if (data.app !== "local-server-vault") throw new Error("app 字段不匹配。");
  if (!Number.isInteger(data.revision) || Number(data.revision) < 1) {
    throw new Error("revision 必须是正整数。");
  }
  if (typeof data.updatedAt !== "string") throw new Error("updatedAt 必须是字符串。");
  if (!Array.isArray(data.hosts)) throw new Error("hosts 必须是数组。");

  for (const host of data.hosts) {
    const result = validateHost(host as Host);
    if (!result.valid) throw new Error(result.errors.join(" "));
  }
}
