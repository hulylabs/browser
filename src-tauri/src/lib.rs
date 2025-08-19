use std::sync::Mutex;

use clap::Parser;
use serde::Serialize;
use tauri::Manager;

#[derive(Parser, Serialize)]
struct Arguments {
    #[clap(long, env = "CEF_MANAGER", default_value = "http://localhost:3000")]
    cef_manager: String,
    #[clap(long, env = "CEF", default_value = "")]
    cef: String,
}

#[derive(Default)]
struct BrowserState {
    cef_manager: String,
    cef: String,
}

#[tauri::command]
fn get_args(app_handle: tauri::AppHandle) -> Arguments {
    let state = app_handle.state::<Mutex<BrowserState>>();
    let state = state.lock().expect("Failed to lock BrowserState");
    return Arguments {
        cef_manager: state.cef_manager.clone(),
        cef: state.cef.clone(),
    };
}


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let args = Arguments::parse();

    tauri::Builder::default()
        .setup(move |app| {
            app.manage(Mutex::new(BrowserState {
                cef_manager: args.cef_manager,
                cef: args.cef,
            }));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler!(get_args))
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
