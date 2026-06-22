import { useEffect, useMemo, useState } from "react";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { HostDetail } from "./components/HostDetail";
import { HostForm } from "./components/HostForm";
import { HostList } from "./components/HostList";
import { Layout } from "./components/Layout";
import { SettingsPanel } from "./components/SettingsPanel";
import { Toast, type ToastMessage, type ToastTone } from "./components/Toast";
import { exportVault, importVaultFromPath, selectImportFile } from "./services/importExportService";
import { openSshTerminal } from "./services/sshLaunchService";
import { backupVault, initializeApp, saveVault } from "./services/vaultService";
import type { Settings } from "./types/settings";
import type { Host, HostDraft, VaultData } from "./types/vault";
import { isoNow } from "./utils/date";
import { createId } from "./utils/id";

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function matchesHost(host: Host, search: string): boolean {
  const keyword = search.trim().toLowerCase();
  if (!keyword) return true;
  return [
    host.name,
    host.address,
    host.username,
    host.password,
    host.group,
    host.note,
    ...host.tags,
  ].some((value) => value.toLowerCase().includes(keyword));
}

export default function App() {
  const [vault, setVault] = useState<VaultData | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [dataDir, setDataDir] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [hostForm, setHostForm] = useState<Host | null | false>(false);
  const [showSettings, setShowSettings] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [loadingError, setLoadingError] = useState("");

  const pushToast = (text: string, tone: ToastTone = "info") => {
    const id = createId();
    setToasts((current) => [...current, { id, text, tone }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4800);
  };

  useEffect(() => {
    initializeApp()
      .then((state) => {
        setVault(state.vault);
        setSettings(state.settings);
        setDataDir(state.dataDir);
        setSelectedId(state.vault.hosts[0]?.id ?? null);
        state.warnings.forEach((warning) => pushToast(warning, "error"));
      })
      .catch((error) => setLoadingError(errorText(error)));
  }, []);

  const groups = useMemo(() => {
    if (!vault) return [];
    return [...new Set(vault.hosts.map((host) => host.group).filter(Boolean))].sort();
  }, [vault]);

  const tags = useMemo(() => {
    if (!vault) return [];
    return [...new Set(vault.hosts.flatMap((host) => host.tags))].sort();
  }, [vault]);

  const filteredHosts = useMemo(() => {
    if (!vault) return [];
    return vault.hosts
      .filter((host) => (groupFilter ? host.group === groupFilter : true))
      .filter((host) => (tagFilter ? host.tags.includes(tagFilter) : true))
      .filter((host) => matchesHost(host, search))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [vault, groupFilter, tagFilter, search]);

  const selectedHost = vault?.hosts.find((host) => host.id === selectedId) ?? filteredHosts[0] ?? null;

  const persistVault = async (nextVault: VaultData, successMessage: string) => {
    try {
      const saved = await saveVault(nextVault);
      setVault(saved);
      if (selectedId && !saved.hosts.some((host) => host.id === selectedId)) {
        setSelectedId(saved.hosts[0]?.id ?? null);
      }
      pushToast(successMessage, "success");
    } catch (error) {
      pushToast(errorText(error), "error");
    }
  };

  const saveHost = async (draft: HostDraft) => {
    if (!vault) return;
    const now = isoNow();
    const editing = hostForm || null;
    const nextHost: Host = editing
      ? { ...editing, ...draft, updatedAt: now }
      : { ...draft, id: createId(), createdAt: now, updatedAt: now };

    const nextVault: VaultData = {
      ...vault,
      hosts: editing
        ? vault.hosts.map((host) => (host.id === editing.id ? nextHost : host))
        : [...vault.hosts, nextHost],
    };
    await persistVault(nextVault, editing ? "服务器已保存。" : "服务器已新增。");
    setSelectedId(nextHost.id);
    setHostForm(false);
  };

  const deleteHost = async (host: Host) => {
    if (!vault) return;
    if (!window.confirm(`确定删除服务器：${host.name}？`)) return;
    try {
      const backupPath = await backupVault();
      pushToast(`已自动备份当前数据：${backupPath}`, "info");
      await persistVault({ ...vault, hosts: vault.hosts.filter((item) => item.id !== host.id) }, "服务器已删除。");
    } catch (error) {
      pushToast(errorText(error), "error");
    }
  };

  const copyValue = async (value: string, label: string) => {
    if (!value) return;
    try {
      await writeText(value);
      pushToast(`${label} 已复制。`, "success");
    } catch (error) {
      pushToast(errorText(error), "error");
    }
  };

  const connectSsh = async (host: Host) => {
    try {
      const result = await openSshTerminal(host);
      pushToast(
        result.success
          ? "已尝试在本机终端执行 SSH。"
          : `未能打开本机终端：${result.message}`,
        result.success ? "success" : "error",
      );
    } catch (error) {
      pushToast(errorText(error), "error");
    }
  };

  const doExport = async () => {
    if (!vault) return;
    const confirmed = window.confirm("导出的 JSON 会包含服务器密码。确认继续导出？");
    if (!confirmed) return;
    try {
      const path = await exportVault(vault);
      if (path) pushToast(`JSON 导出成功：${path}`, "success");
    } catch (error) {
      pushToast(`JSON 导出失败：${errorText(error)}`, "error");
    }
  };

  const doImport = async () => {
    if (!vault) return;
    try {
      const path = await selectImportFile();
      if (!path) return;
      const backupPath = await backupVault();
      pushToast(`已自动备份当前数据：${backupPath}`, "info");
      const confirmed = window.confirm("导入会替换当前本地数据，导入文件可能包含密码。是否继续？");
      if (!confirmed) return;
      const result = await importVaultFromPath(path, vault.revision);
      setVault(result.vault);
      setSelectedId(result.vault.hosts[0]?.id ?? null);
      pushToast("JSON 导入成功。", "success");
    } catch (error) {
      pushToast(`JSON 导入失败：${errorText(error)}`, "error");
    }
  };

  if (loadingError) {
    return <div className="fatal-error">启动失败：{loadingError}</div>;
  }

  if (!vault || !settings) {
    return <div className="loading">正在加载服务器资料库...</div>;
  }

  return (
    <>
      <Layout
        actions={
          <>
            <button type="button" className="primary" onClick={() => setHostForm(null)}>新增服务器</button>
            <button type="button" onClick={doImport}>导入 JSON</button>
            <button type="button" onClick={doExport}>导出 JSON</button>
            <button type="button" onClick={() => setShowSettings(true)}>设置</button>
          </>
        }
        sidebar={
          <>
            <button
              type="button"
              className={!groupFilter && !tagFilter ? "filter active" : "filter"}
              onClick={() => {
                setGroupFilter(null);
                setTagFilter(null);
              }}
            >
              All Hosts
            </button>
            <h3>Groups</h3>
            {groups.length === 0 && <p className="muted">暂无分组</p>}
            {groups.map((group) => (
              <button
                type="button"
                key={group}
                className={groupFilter === group ? "filter active" : "filter"}
                onClick={() => {
                  setGroupFilter(group);
                  setTagFilter(null);
                }}
              >
                {group}
              </button>
            ))}
            <h3>Tags</h3>
            {tags.length === 0 && <p className="muted">暂无标签</p>}
            {tags.map((tag) => (
              <button
                type="button"
                key={tag}
                className={tagFilter === tag ? "filter active" : "filter"}
                onClick={() => {
                  setTagFilter(tag);
                  setGroupFilter(null);
                }}
              >
                {tag}
              </button>
            ))}
            <div className="data-dir">数据目录：{dataDir}</div>
          </>
        }
        list={
          <HostList
            hosts={filteredHosts}
            selectedId={selectedHost?.id ?? null}
            search={search}
            onSearchChange={setSearch}
            onSelect={(host) => setSelectedId(host.id)}
          />
        }
        detail={
          <HostDetail
            host={selectedHost}
            revealPasswords={settings.revealPasswords}
            onSsh={connectSsh}
            onCopy={copyValue}
            onEdit={(host) => setHostForm(host)}
            onDelete={deleteHost}
          />
        }
      />
      {hostForm !== false && <HostForm host={hostForm} onCancel={() => setHostForm(false)} onSave={saveHost} />}
      {showSettings && (
        <SettingsPanel
          settings={settings}
          onClose={() => setShowSettings(false)}
          onSaved={setSettings}
          onToast={pushToast}
        />
      )}
      <Toast messages={toasts} onDismiss={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))} />
    </>
  );
}
