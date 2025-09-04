use std::{
    fs, io,
    net::TcpListener,
    path::{Path, PathBuf},
    process::Command,
    sync::{Arc, Mutex},
};

use tauri::Manager;
use tungstenite::connect;

use crate::BrowserState;

#[cfg(target_os = "linux")]
const CEF_EXE: &str = "huly-cef-websockets";
#[cfg(target_os = "macos")]
const CEF_EXE: &str = "huly-cef-websockets.app/Contents/MacOS/huly-cef-websockets";
#[cfg(target_os = "windows")]
const CEF_EXE: &str = "huly-cef-websockets.exe";

#[tauri::command]
pub async fn launch_cef(app_handle: tauri::AppHandle) -> Result<String, String> {
    let (cef_dir, cef_cache) = get_cef_paths(&app_handle)?;

    let temp_cef_dir = std::env::temp_dir().join("huly-cef");
    fs::remove_dir_all(&temp_cef_dir)
        .map_err(|e| format!("failed to remove old temp CEF dir: {e}"))?;
    copy_dir_all(&cef_dir, &temp_cef_dir).map_err(|e| format!("failed to copy CEF: {e}"))?;

    let cef_exe = temp_cef_dir.join(CEF_EXE);

    let port = find_available_port().map_err(|e| format!("couldn't find available port: {e}"))?;
    let mut command = Command::new(cef_exe);
    command
        .args(["--port", &port.to_string()])
        .args(["--cache-path", cef_cache.to_str().unwrap()]);

    #[cfg(target_os = "windows")]
    {
        command.creation_flags(0x08000000);
    }

    let cef = command.spawn().map_err(|e| {
        format!("failed to launch CEF with params port {port} cache-dir {cef_cache:?}: {e}")
    })?;

    wait_for_cef(port).map_err(|e| {
        format!("CEF failed to start with params port {port} cache-dir {cef_cache:?}: {e}")
    })?;

    app_handle
        .state::<Arc<Mutex<BrowserState>>>()
        .lock()
        .unwrap()
        .cef_process = Some(cef);

    Ok(format!("ws://localhost:{port}/browser"))
}

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

fn get_cef_paths(app_handle: &tauri::AppHandle) -> Result<(PathBuf, PathBuf), String> {
    let app_resource_dir = app_handle
        .path()
        .resource_dir()
        .map_err(|_| "app resource directory not found")?;
    let app_cache_dir = app_handle
        .path()
        .app_cache_dir()
        .map_err(|_| "app cache directory not found")?;

    let cef_dir = app_resource_dir.join("cef");
    let cef_cache = app_cache_dir.join("cefcache");

    Ok((cef_dir, cef_cache))
}

fn wait_for_cef(port: u16) -> Result<(), String> {
    for _ in 0..10 {
        std::thread::sleep(std::time::Duration::from_millis(500));
        if healthcheck("localhost", port) {
            return Ok(());
        }
    }

    Err("CEF healthcheck failed".into())
}

fn healthcheck(host: &str, port: u16) -> bool {
    let address = format!("ws://{}:{}", host, port);
    connect(address.clone()).is_ok()
}

fn find_available_port() -> Result<u16, String> {
    for port in 10000..50000 {
        if let Ok(_) = TcpListener::bind(format!("0.0.0.0:{}", port)) {
            return Ok(port);
        }
    }
    Err("No available ports found".into())
}
