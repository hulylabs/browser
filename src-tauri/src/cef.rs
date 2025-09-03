use std::{
    fs,
    io::Cursor,
    net::TcpListener,
    path::PathBuf,
    sync::{Arc, Mutex},
};

use serde::Serialize;
use tauri::{Manager, ipc::Channel};
use tungstenite::connect;
use zip::ZipArchive;

use crate::BrowserState;

#[cfg(target_os = "linux")]
const CEF_URL: &str =
    "https://github.com/hulylabs/huly-cef/releases/latest/download/huly-cef-linux.zip";
#[cfg(target_os = "macos")]
const CEF_URL: &str =
    "https://github.com/hulylabs/huly-cef/releases/latest/download/huly-cef-macos.zip";
#[cfg(target_os = "windows")]
const CEF_URL: &str =
    "https://github.com/hulylabs/huly-cef/releases/latest/download/huly-cef-windows.zip";

#[cfg(target_os = "linux")]
const CEF_EXE: &str = "huly-cef-websockets";
#[cfg(target_os = "macos")]
const CEF_EXE: &str = "huly-cef-websockets.app/Contents/MacOS/huly-cef-websockets";
#[cfg(target_os = "windows")]
const CEF_EXE: &str = "huly-cef-websockets.exe";

#[derive(Clone, Serialize)]
pub enum LaunchEvent {
    Downloading,
    Unpacking,
    Launching,
}

#[tauri::command]
pub async fn launch_cef(
    app_handle: tauri::AppHandle,
    channel: Channel<LaunchEvent>,
) -> Result<String, String> {
    let (cef_dir, cef_cache, cef_exe) = get_cef_paths(app_handle.clone())?;
    ensure_cef_installed(&cef_dir, &cef_exe, &channel).await?;

    _ = channel.send(LaunchEvent::Launching);

    let port = find_available_port().map_err(|e| format!("couldn't find available port: {e}"))?;
    let mut command = std::process::Command::new(cef_exe);
    command
        .args(["--port", &port.to_string()])
        .args(["--cache-path", cef_cache.to_str().unwrap()]);

    #[cfg(target_os = "windows")]
    {
        command.creation_flags(0x08000000);
    }

    let cef = command
        .spawn()
        .map_err(|e| format!("failed to launch CEF: {e}"))?;

    wait_for_cef(port)?;

    app_handle
        .state::<Arc<Mutex<BrowserState>>>()
        .lock()
        .unwrap()
        .cef_process = Some(cef);

    Ok(format!("ws://localhost:{port}/browser"))
}

fn get_cef_paths(app_handle: tauri::AppHandle) -> Result<(PathBuf, PathBuf, PathBuf), String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|_| "app data directory not found")?;
    let app_cache_dir = app_handle
        .path()
        .app_cache_dir()
        .map_err(|_| "resource directory not found")?;

    let cef_dir = app_data_dir.join("cef");
    let cef_cache = app_cache_dir.join("cef");
    let cef_exe = cef_dir.join(CEF_EXE);

    Ok((cef_dir, cef_cache, cef_exe))
}

async fn ensure_cef_installed(
    cef_dir: &PathBuf,
    cef_exe: &PathBuf,
    channel: &Channel<LaunchEvent>,
) -> Result<(), String> {
    if !cef_exe.exists() {
        _ = channel.send(LaunchEvent::Downloading);
        download_and_extract_cef(&cef_dir, &channel)
            .await
            .map_err(|e| format!("failed to download CEF: {}", e))?;
    }
    Ok(())
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

async fn download_and_extract_cef(
    dir: &PathBuf,
    channel: &Channel<LaunchEvent>,
) -> anyhow::Result<()> {
    let response = reqwest::get(CEF_URL).await?;
    let data = response.bytes().await?.to_vec();
    _ = channel.send(LaunchEvent::Unpacking);
    let result = ZipArchive::new(Cursor::new(data))?.extract(&dir);

    if let Err(e) = &result {
        _ = fs::remove_dir_all(dir);
        return Err(anyhow::anyhow!("failed to extract zip: {}", e));
    }
    Ok(())
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
