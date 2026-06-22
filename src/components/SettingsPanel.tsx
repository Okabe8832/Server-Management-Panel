import { useState } from "react";
import type { Settings } from "../types/settings";
import { saveSettings } from "../services/settingsService";

interface SettingsPanelProps {
  settings: Settings;
  onClose: () => void;
  onSaved: (settings: Settings) => void;
  onToast: (text: string, tone?: "success" | "error" | "info") => void;
}

export function SettingsPanel({ settings, onClose, onSaved, onToast }: SettingsPanelProps) {
  const [draft, setDraft] = useState<Settings>({
    ...settings,
    revealPasswords: settings.revealPasswords ?? false,
  });

  const submit = async () => {
    try {
      const saved = await saveSettings(draft);
      onSaved(saved);
      onToast("设置已保存。", "success");
      onClose();
    } catch (error) {
      onToast(error instanceof Error ? error.message : "设置保存失败。", "error");
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <header>
          <h2>设置</h2>
          <button type="button" onClick={onClose}>关闭</button>
        </header>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={draft.revealPasswords}
            onChange={(event) => setDraft({ ...draft, revealPasswords: event.target.checked })}
          />
          在详情页显示密码明文
        </label>
        <p className="security-note">JSON 导入导出会包含密码。分享配置前，请确认接收方可信。</p>
        <footer>
          <button type="button" onClick={onClose}>取消</button>
          <button type="button" className="primary" onClick={submit}>保存设置</button>
        </footer>
      </div>
    </div>
  );
}
