use std::{
    path::PathBuf,
    process::{Child, Command, Stdio},
    sync::{Arc, Mutex},
};

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
        let mut process = self.inner.lock().unwrap();
        *process = Some(
            Command::new(path)
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .spawn()
                .expect("Failed to start huly-cef"),
        );
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
                .join("cef/huly-cef-websockets");

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
