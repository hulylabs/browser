use std::{
    path::PathBuf,
    process::{Child, Command, Stdio},
    sync::{Arc, Mutex},
};

#[cfg(target_os = "linux")]
const HULY_CEF_BINARY: &str = "huly-cef-websockets";
#[cfg(target_os = "macos")]
const HULY_CEF_BINARY_MACOS: &str = "huly-cef-websockets.app";
#[cfg(target_os = "windows")]
const HULY_CEF_BINARY_WINDOWS: &str = "huly-cef-websockets.exe";

use tauri::Manager;

struct CefProcess {
    inner: Arc<Mutex<Option<Child>>>,
}

impl CefProcess {
    fn new() -> Self {
        Self {
            inner: Arc::new(Mutex::new(None)),
        }
    }

    fn start(&self, path: PathBuf) {
        let cef_process = if cfg!(target_os = "macos") {
            Command::new("open")
                .arg(path)
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .spawn()
        } else {
            Command::new(path)
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .spawn()
        }
        .expect("failed to start huly-cef");

        let mut lock = self.inner.lock().unwrap();
        *lock = Some(cef_process);
    }

    fn clone(&self) -> Self {
        Self {
            inner: Arc::clone(&self.inner),
        }
    }

    fn kill(&self) {
        let mut process = self.inner.lock().unwrap();
        if let Some(ref mut child) = *process {
            child.kill().expect("Failed to kill huly-cef");
            *process = None;
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let cef = CefProcess::new();
    let cef_clone = cef.clone();

    tauri::Builder::default()
        .setup(move |app| {
            let huly_cef_path = app
                .path()
                .resource_dir()
                .expect("Failed to get resource dir")
                .join(format!("cef/{HULY_CEF_BINARY}"));

            if !huly_cef_path.exists() {
                println!("cef not found");
            } else {
                cef.start(huly_cef_path);
            }

            Ok(())
        })
        .on_window_event(move |_, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                cef_clone.kill();
            }
        })
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
