use std::{
    fs, io,
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::{Arc, Mutex},
};

use tauri::Manager;

#[cfg(target_os = "linux")]
const HULY_CEF_BINARY: &str = "huly-cef-websockets";
#[cfg(target_os = "macos")]
const HULY_CEF_BINARY: &str = "huly-cef-websockets.app";
#[cfg(target_os = "windows")]
const HULY_CEF_BINARY: &str = "huly-cef-websockets.exe";

fn copy_dir_all(src: impl AsRef<Path>, dst: impl AsRef<Path>) -> io::Result<()> {
    fs::create_dir_all(&dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        if ty.is_dir() {
            copy_dir_all(entry.path(), dst.as_ref().join(entry.file_name()))?;
        } else {
            fs::copy(entry.path(), dst.as_ref().join(entry.file_name()))?;
        }
    }
    Ok(())
}

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
        let cef_process = Command::new(path)
                .stdout(Stdio::inherit())
                .stderr(Stdio::inherit())
                .spawn()
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
            child.kill().expect("failed to kill huly-cef");
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let cef = CefProcess::new();
    let cef_clone = cef.clone();

    tauri::Builder::default()
        .setup(move |app| {
            let mut huly_cef_path = app
                .path()
                .resource_dir()
                .expect("failed to get resource dir")
                .join(format!("cef/{HULY_CEF_BINARY}"));

            if !huly_cef_path.exists() {
                println!("huly-cef-websockets not found");
                return Ok(());
            }

            if cfg!(target_os = "macos") {
                let huly_cef_tmp = PathBuf::from("/tmp/huly-cef-websockets.app");
                copy_dir_all(&huly_cef_path, &huly_cef_tmp)?;
                huly_cef_path = huly_cef_tmp.join("Contents/MacOS/huly-cef-websockets");
            }

            cef.start(huly_cef_path);

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
