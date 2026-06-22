use chrono::Local;
use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
    process::Command,
};
use tauri::{AppHandle, Manager};

const APP_NAME: &str = "local-server-vault";
const SCHEMA_VERSION: u32 = 2;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Host {
    pub id: String,
    pub name: String,
    #[serde(alias = "host")]
    pub address: String,
    pub port: u16,
    #[serde(default, alias = "user")]
    pub username: String,
    #[serde(default)]
    pub password: String,
    #[serde(default)]
    pub group: String,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub note: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultData {
    pub schema: u32,
    pub app: String,
    pub revision: u32,
    pub updated_at: String,
    pub hosts: Vec<Host>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    #[serde(default)]
    pub last_export_dir: String,
    #[serde(default)]
    pub last_import_dir: String,
    #[serde(default)]
    pub reveal_passwords: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppState {
    pub vault: VaultData,
    pub settings: Settings,
    pub data_dir: String,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportResult {
    pub vault: VaultData,
    pub backup_path: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchResult {
    pub success: bool,
    pub message: String,
    pub attempted_path: String,
}

fn now_iso() -> String {
    Local::now().to_rfc3339()
}

fn timestamp() -> String {
    Local::now().format("%Y%m%d-%H%M%S").to_string()
}

fn default_vault() -> VaultData {
    VaultData {
        schema: SCHEMA_VERSION,
        app: APP_NAME.to_string(),
        revision: 1,
        updated_at: now_iso(),
        hosts: vec![],
    }
}

fn default_settings() -> Settings {
    Settings {
        last_export_dir: String::new(),
        last_import_dir: String::new(),
        reveal_passwords: false,
    }
}

fn app_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|error| format!("无法获取应用数据目录：{error}"))
}

fn ensure_dirs(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app_data_dir(app)?;
    fs::create_dir_all(dir.join("backups"))
        .map_err(|error| format!("创建数据目录失败：{error}"))?;
    Ok(dir)
}

fn vault_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(ensure_dirs(app)?.join("vault.json"))
}

fn settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(ensure_dirs(app)?.join("settings.json"))
}

fn backups_dir(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(ensure_dirs(app)?.join("backups"))
}

fn write_json<T: Serialize>(path: &Path, value: &T) -> Result<(), String> {
    let body = serde_json::to_string_pretty(value)
        .map_err(|error| format!("序列化 JSON 失败：{error}"))?;
    fs::write(path, format!("{body}\n")).map_err(|error| format!("写入文件失败：{error}"))
}

fn spawn_command(program: &str, args: &[&str]) -> Result<(), String> {
    Command::new(program)
        .args(args)
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("{program} 执行失败：{error}"))
}

fn launch_result(
    attempted_path: String,
    result: Result<(), String>,
    success_message: &str,
) -> LaunchResult {
    match result {
        Ok(()) => LaunchResult {
            success: true,
            message: success_message.to_string(),
            attempted_path,
        },
        Err(error) => LaunchResult {
            success: false,
            message: error,
            attempted_path,
        },
    }
}

fn escape_applescript_string(value: &str) -> String {
    value.replace('\\', "\\\\").replace('"', "\\\"")
}

fn assert_safe_ssh_token(value: &str, label: &str, allow_colon: bool) -> Result<(), String> {
    if value.trim().is_empty() {
        return Ok(());
    }
    let safe = value.chars().all(|ch| {
        ch.is_ascii_alphanumeric() || matches!(ch, '.' | '_' | '-') || (allow_colon && ch == ':')
    });
    if safe {
        Ok(())
    } else {
        Err(format!("{label} 包含不安全字符，请检查服务器资料。"))
    }
}

fn build_ssh_command(address: &str, port: u16, username: &str) -> Result<String, String> {
    let address = address.trim();
    let username = username.trim();
    if address.is_empty() {
        return Err("IP / 地址不能为空。".to_string());
    }
    if port == 0 {
        return Err("端口必须在 1 到 65535 之间。".to_string());
    }
    assert_safe_ssh_token(address, "IP / 地址", true)?;
    assert_safe_ssh_token(username, "登录名", false)?;
    let target = if username.is_empty() {
        address.to_string()
    } else {
        format!("{username}@{address}")
    };
    Ok(format!("ssh -p {port} {target}"))
}

fn read_json<T: for<'de> Deserialize<'de>>(path: &Path) -> Result<T, String> {
    let body = fs::read_to_string(path).map_err(|error| format!("读取文件失败：{error}"))?;
    serde_json::from_str(&body).map_err(|error| format!("JSON 格式错误：{error}"))
}

fn validate_vault(vault: &VaultData) -> Result<(), String> {
    if vault.schema != SCHEMA_VERSION {
        return Err(format!("不支持的 schema：{}", vault.schema));
    }
    if vault.app != APP_NAME {
        return Err("app 字段不匹配".to_string());
    }
    for host in &vault.hosts {
        if host.id.trim().is_empty() {
            return Err("服务器 id 不能为空".to_string());
        }
        if host.name.trim().is_empty() {
            return Err(format!("服务器 {} 的名称不能为空", host.id));
        }
        if host.address.trim().is_empty() {
            return Err(format!("服务器 {} 的 IP/地址不能为空", host.name));
        }
        if host.port == 0 {
            return Err(format!("服务器 {} 的端口必须在 1 到 65535 之间", host.name));
        }
    }
    Ok(())
}

fn latest_backup(app: &AppHandle) -> Result<Option<PathBuf>, String> {
    let mut backups: Vec<PathBuf> = fs::read_dir(backups_dir(app)?)
        .map_err(|error| format!("读取备份目录失败：{error}"))?
        .filter_map(|entry| entry.ok().map(|item| item.path()))
        .filter(|path| {
            path.file_name()
                .and_then(|name| name.to_str())
                .map(|name| name.starts_with("vault-backup-") && name.ends_with(".json"))
                .unwrap_or(false)
        })
        .collect();
    backups.sort();
    Ok(backups.pop())
}

fn create_backup(app: &AppHandle) -> Result<PathBuf, String> {
    let source = vault_path(app)?;
    if !source.exists() {
        return Err("vault.json 不存在，无法备份".to_string());
    }
    let backup = backups_dir(app)?.join(format!("vault-backup-{}.json", timestamp()));
    fs::copy(&source, &backup).map_err(|error| format!("备份 vault.json 失败：{error}"))?;
    Ok(backup)
}

fn load_or_create_settings(app: &AppHandle) -> Result<Settings, String> {
    let path = settings_path(app)?;
    if path.exists() {
        let mut settings: Settings = read_json(&path)?;
        settings.last_export_dir = settings.last_export_dir.trim().to_string();
        settings.last_import_dir = settings.last_import_dir.trim().to_string();
        return Ok(settings);
    }
    let settings = default_settings();
    write_json(&path, &settings)?;
    Ok(settings)
}

fn migrate_vault(mut vault: VaultData) -> VaultData {
    vault.schema = SCHEMA_VERSION;
    vault.app = APP_NAME.to_string();
    for host in &mut vault.hosts {
        host.name = host.name.trim().to_string();
        host.address = host.address.trim().to_string();
        host.username = host.username.trim().to_string();
        host.group = host.group.trim().to_string();
        host.tags = host
            .tags
            .iter()
            .map(|tag| tag.trim().to_string())
            .filter(|tag| !tag.is_empty())
            .collect();
    }
    vault
}

fn load_or_create_vault(app: &AppHandle) -> Result<(VaultData, Vec<String>), String> {
    let path = vault_path(app)?;
    let mut warnings = vec![];
    if !path.exists() {
        let vault = default_vault();
        write_json(&path, &vault)?;
        return Ok((vault, warnings));
    }

    match read_json::<VaultData>(&path)
        .map(migrate_vault)
        .and_then(|vault| {
            validate_vault(&vault)?;
            Ok(vault)
        }) {
        Ok(vault) => {
            write_json(&path, &vault)?;
            Ok((vault, warnings))
        }
        Err(error) => {
            let corrupt_path = path.with_file_name(format!("vault-corrupt-{}.json", timestamp()));
            fs::copy(&path, &corrupt_path)
                .map_err(|copy_error| format!("vault.json 损坏且保存损坏副本失败：{copy_error}"))?;
            warnings.push(format!(
                "vault.json 损坏，已保存损坏副本：{}。原错误：{}",
                corrupt_path.display(),
                error
            ));

            if let Some(backup) = latest_backup(app)? {
                let vault: VaultData = migrate_vault(read_json(&backup)?);
                validate_vault(&vault)?;
                write_json(&path, &vault)?;
                warnings.push(format!("已从最近备份恢复：{}", backup.display()));
                Ok((vault, warnings))
            } else {
                let vault = default_vault();
                write_json(&path, &vault)?;
                warnings
                    .push("未找到可用备份，已创建新的空 vault.json；损坏文件已保留。".to_string());
                Ok((vault, warnings))
            }
        }
    }
}

#[tauri::command]
pub fn initialize_app(app: AppHandle) -> Result<AppState, String> {
    let dir = ensure_dirs(&app)?;
    let (vault, warnings) = load_or_create_vault(&app)?;
    let settings = load_or_create_settings(&app)?;
    Ok(AppState {
        vault,
        settings,
        data_dir: dir.display().to_string(),
        warnings,
    })
}

#[tauri::command]
pub fn save_vault(app: AppHandle, mut vault: VaultData) -> Result<VaultData, String> {
    vault = migrate_vault(vault);
    validate_vault(&vault)?;
    vault.revision = vault.revision.saturating_add(1);
    vault.updated_at = now_iso();
    write_json(&vault_path(&app)?, &vault)?;
    Ok(vault)
}

#[tauri::command]
pub fn backup_vault(app: AppHandle) -> Result<String, String> {
    Ok(create_backup(&app)?.display().to_string())
}

#[tauri::command]
pub fn save_settings(app: AppHandle, settings: Settings) -> Result<Settings, String> {
    write_json(&settings_path(&app)?, &settings)?;
    Ok(settings)
}

#[tauri::command]
pub fn import_vault_from_path(
    app: AppHandle,
    path: String,
    current_revision: u32,
) -> Result<ImportResult, String> {
    let import_path = PathBuf::from(path);
    let mut imported: VaultData = migrate_vault(read_json(&import_path)?);
    validate_vault(&imported)?;
    let backup = create_backup(&app)?;
    imported.revision = current_revision.saturating_add(1);
    imported.updated_at = now_iso();
    write_json(&vault_path(&app)?, &imported)?;
    Ok(ImportResult {
        vault: imported,
        backup_path: backup.display().to_string(),
    })
}

#[tauri::command]
pub fn export_vault_to_path(_app: AppHandle, vault: VaultData, path: String) -> Result<(), String> {
    let vault = migrate_vault(vault);
    validate_vault(&vault)?;
    write_json(&PathBuf::from(path), &vault)
}

#[tauri::command]
pub fn open_ssh_terminal(
    address: String,
    port: u16,
    username: String,
) -> Result<LaunchResult, String> {
    let command = build_ssh_command(&address, port, &username)?;

    #[cfg(target_os = "macos")]
    {
        let script = format!(
            "tell application \"Terminal\" to do script \"{}\"",
            escape_applescript_string(&command)
        );
        let result = spawn_command(
            "osascript",
            &[
                "-e",
                "tell application \"Terminal\" to activate",
                "-e",
                &script,
            ],
        );
        Ok(launch_result(
            "Terminal".to_string(),
            result,
            "已在 Terminal 中执行 SSH 命令。",
        ))
    }

    #[cfg(target_os = "windows")]
    {
        let wt = spawn_command("wt", &["cmd", "/K", &command]);
        if wt.is_ok() {
            return Ok(LaunchResult {
                success: true,
                message: "已在 Windows Terminal 中执行 SSH 命令。".to_string(),
                attempted_path: "wt".to_string(),
            });
        }
        let cmd = spawn_command("cmd", &["/C", "start", "cmd", "/K", &command]);
        Ok(launch_result(
            "cmd".to_string(),
            cmd,
            "已在 cmd 中执行 SSH 命令。",
        ))
    }

    #[cfg(target_os = "linux")]
    {
        let attempts: [(&str, Vec<&str>); 4] = [
            ("x-terminal-emulator", vec!["-e", "sh", "-lc", &command]),
            ("gnome-terminal", vec!["--", "sh", "-lc", &command]),
            ("konsole", vec!["-e", "sh", "-lc", &command]),
            ("xfce4-terminal", vec!["-e", "sh", "-lc", &command]),
        ];
        for (terminal, args) in attempts {
            let result = spawn_command(terminal, &args);
            if result.is_ok() {
                return Ok(LaunchResult {
                    success: true,
                    message: format!("已在 {terminal} 中执行 SSH 命令。"),
                    attempted_path: terminal.to_string(),
                });
            }
        }
        Ok(LaunchResult {
            success: false,
            message: "未能打开系统终端。".to_string(),
            attempted_path: String::new(),
        })
    }
}
