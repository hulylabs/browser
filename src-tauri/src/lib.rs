use std::{
    process::Child,
    sync::{Arc, Mutex},
};

use clap::Parser;
use serde::Serialize;
use tauri::Manager;

mod cef;

#[derive(Parser, Serialize, Clone)]
struct Arguments {
    #[clap(long, env = "PROFILES_ENABLED", default_value = "false")]
    profiles_enabled: bool,
    #[clap(long, env = "CEF_MANAGER", default_value = "http://localhost:3000")]
    cef_manager: String,
    #[clap(long, env = "CEF", default_value = "")]
    cef: String,
}

struct BrowserState {
    args: Arguments,
    cef_process: Option<Child>,
}

#[tauri::command]
fn get_args(app_handle: tauri::AppHandle) -> Arguments {
    let state = app_handle.state::<Arc<Mutex<BrowserState>>>();
    let state = state.lock().expect("Failed to lock BrowserState");
    return state.args.clone();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let args = Arguments::parse();

    let state = Arc::new(Mutex::new(BrowserState {
        args,
        cef_process: None,
    }));
    let clone = state.clone();
    tauri::Builder::default()
        .setup(move |app| {
            app.manage(state);
            Ok(())
        })
        .on_window_event(move |_, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                let cef_process = clone.lock().unwrap().cef_process.take();
                if let Some(mut cef_process) = cef_process {
                    let _ = cef_process.kill();
                }
            }
        })
        .invoke_handler(tauri::generate_handler!(
            get_args,
            cef::is_cef_present,
            cef::download_cef,
            cef::launch_cef
        ))
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
