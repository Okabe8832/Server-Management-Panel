import { useMemo, useState } from "react";
import type { Host, HostDraft } from "../types/vault";
import { cleanTags, normalizeHostDraft, validateHostDraft } from "../utils/validation";

interface HostFormProps {
  host?: Host | null;
  onCancel: () => void;
  onSave: (draft: HostDraft) => void;
}

export function HostForm({ host, onCancel, onSave }: HostFormProps) {
  const initial = useMemo<HostDraft>(
    () => ({
      name: host?.name ?? "",
      address: host?.address ?? "",
      port: host?.port ?? 22,
      username: host?.username ?? "",
      password: host?.password ?? "",
      group: host?.group ?? "",
      tags: host?.tags ?? [],
      note: host?.note ?? "",
    }),
    [host],
  );
  const [draft, setDraft] = useState<HostDraft>(initial);
  const [tagText, setTagText] = useState(initial.tags.join(", "));
  const [errors, setErrors] = useState<string[]>([]);

  const update = <K extends keyof HostDraft>(key: K, value: HostDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const submit = () => {
    const normalized = normalizeHostDraft({ ...draft, tags: cleanTags(tagText) });
    const result = validateHostDraft(normalized);
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }
    onSave(normalized);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <header>
          <h2>{host ? "编辑服务器" : "新增服务器"}</h2>
          <button type="button" onClick={onCancel}>关闭</button>
        </header>
        {errors.length > 0 && <div className="form-errors">{errors.join(" ")}</div>}
        <div className="form-grid">
          <label>
            服务器名称
            <input value={draft.name} onChange={(event) => update("name", event.target.value)} placeholder="Production API" />
          </label>
          <label>
            IP / 域名
            <input value={draft.address} onChange={(event) => update("address", event.target.value)} placeholder="10.0.0.12 或 example.com" />
          </label>
          <label>
            端口
            <input
              type="number"
              min="1"
              max="65535"
              value={draft.port}
              onChange={(event) => update("port", Number(event.target.value))}
            />
          </label>
          <label>
            登录名 / Name
            <input value={draft.username} onChange={(event) => update("username", event.target.value)} placeholder="root / admin / deploy" />
          </label>
          <label>
            密码
            <input type="password" value={draft.password} onChange={(event) => update("password", event.target.value)} />
          </label>
          <label>
            分组
            <input value={draft.group} onChange={(event) => update("group", event.target.value)} placeholder="prod / staging / personal" />
          </label>
          <label className="full-span">
            标签
            <input value={tagText} onChange={(event) => setTagText(event.target.value)} placeholder="prod, api, cn" />
          </label>
          <label className="full-span">
            备注
            <textarea value={draft.note} onChange={(event) => update("note", event.target.value)} />
          </label>
        </div>
        <p className="security-note">密码会保存在本地 JSON，并会随导出 JSON 一起分享。</p>
        <footer>
          <button type="button" onClick={onCancel}>取消</button>
          <button type="button" className="primary" onClick={submit}>保存</button>
        </footer>
      </div>
    </div>
  );
}
