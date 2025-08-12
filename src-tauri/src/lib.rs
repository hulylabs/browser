use std::{
    fs, io,
    net::TcpListener,
    path::Path,
    process::{Child, Command, Stdio},
    sync::Mutex,
};

use tauri::Manager;

#[cfg(target_os = "linux")]
const HULY_CEF_BINARY: &str = "huly-cef-websockets";
#[cfg(target_os = "macos")]
const HULY_CEF_BINARY: &str = "huly-cef-websockets.app/Contents/MacOS/huly-cef-websockets";
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

fn find_available_port() -> u16 {
    let listener = TcpListener::bind("127.0.0.1:0").expect("failed to find available port");
    return listener.local_addr().unwrap().port();
}

#[derive(Default)]
struct BrowserState {
    pub cef_processes: Vec<Child>,
}

#[tauri::command]
fn launch_cef_command(app_handle: tauri::AppHandle) -> u16 {
    let port = find_available_port();

    let cef_dir = app_handle
        .path()
        .resource_dir()
        .expect("failed to get resource dir")
        .join(format!("cef"));

    let tmp_cef_dir = std::env::temp_dir().join("huly-browser");
    _ = copy_dir_all(&cef_dir, &tmp_cef_dir);

    let cef_process = Command::new(tmp_cef_dir.join(HULY_CEF_BINARY))
        .args(["--port", port.to_string().as_str()])
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .spawn()
        .expect("failed to start huly-cef");

    let state = app_handle.state::<Mutex<BrowserState>>();
    let mut state = state.lock().unwrap();
    state.cef_processes.push(cef_process);

    return port;
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_cli::init())
        .setup(move |app| {
            app.manage(Mutex::new(BrowserState::default()));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![launch_cef_command])
        .on_window_event(move |window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                let state = window.app_handle().state::<Mutex<BrowserState>>();
                let mut state = state.lock().unwrap();
                for cef_process in state.cef_processes.iter_mut() {
                    cef_process.kill().expect("failed to kill huly-cef");
                }
            }
        })
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
