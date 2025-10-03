use std::{
    net::TcpStream,
    process::Command,
    sync::{Arc, Mutex},
};

use clap::Parser;
use serde::Serialize;
use tauri::Manager;
use tungstenite::{Message, WebSocket, stream::MaybeTlsStream};

mod cef;

#[derive(Debug, Parser, Serialize, Clone)]
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
    cef_connection: Option<WebSocket<MaybeTlsStream<TcpStream>>>,
}

fn construct_close_message() -> Message {
    Message::Text(
        serde_json::json!({
            "id": "close",
            "method": "close",
            "params": {}
        })
        .to_string()
        .into(),
    )
}

#[tauri::command]
fn get_args(app_handle: tauri::AppHandle) -> Arguments {
    let state = app_handle.state::<Arc<Mutex<BrowserState>>>();
    let state = state.lock().expect("Failed to lock BrowserState");
    return state.args.clone();
}

#[tauri::command]
fn show_in_folder(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .args(["-R", &path])
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .args(["/select,", &path])
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "linux")]
    {
        if let Some(parent) = std::path::Path::new(&path).parent() {
            Command::new("xdg-open")
                .arg(parent)
                .spawn()
                .map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let args = Arguments::parse();

    let state = Arc::new(Mutex::new(BrowserState {
        args,
        cef_connection: None,
    }));
    let clone = state.clone();
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(move |app| {
            app.manage(state);
            Ok(())
        })
        .on_window_event(move |_, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                let mut state = clone.lock().expect("Failed to lock BrowserState");
                if let Some(mut connection) = state.cef_connection.take() {
                    _ = connection.send(construct_close_message());
                }
            }
        })
        .invoke_handler(tauri::generate_handler!(
            get_args,
            show_in_folder,
            cef::is_cef_present,
            cef::download_cef,
            cef::launch_cef
        ))
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
