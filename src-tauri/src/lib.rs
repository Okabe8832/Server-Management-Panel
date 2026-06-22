mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::initialize_app,
            commands::save_vault,
            commands::backup_vault,
            commands::save_settings,
            commands::import_vault_from_path,
            commands::export_vault_to_path,
            commands::open_ssh_terminal
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
