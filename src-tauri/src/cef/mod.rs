use std::{
    fs,
    process::Command,
    sync::{Arc, Mutex},
};

use tauri::Manager;

use crate::{
    BrowserState,
    cef::utils::{
        compare_checksums, copy_dir_all, download_and_extract, find_available_port, get_cef_paths,
        wait_for_cef,
    },
};

mod utils;

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
#[cfg(all(target_os = "macos", target_arch = "aarch64"))]
const CEF_EXE: &str = "huly-cef-websockets-arm64.app/Contents/MacOS/huly-cef-websockets";
#[cfg(all(target_os = "macos", target_arch = "x86_64"))]
const CEF_EXE: &str = "huly-cef-websockets-x86_64.app/Contents/MacOS/huly-cef-websockets";
#[cfg(target_os = "windows")]
const CEF_EXE: &str = "huly-cef-websockets.exe";

#[tauri::command]
pub async fn is_cef_present(app_handle: tauri::AppHandle) -> Result<bool, String> {
    let (cef_dir, _) = get_cef_paths(&app_handle)?;
    compare_checksums(CEF_URL, cef_dir.join("checksum")).await
}

#[tauri::command]
pub async fn download_cef(app_handle: tauri::AppHandle) -> Result<(), String> {
    let (cef_dir, _) = get_cef_paths(&app_handle)?;
    let result = download_and_extract(CEF_URL, &cef_dir).await;
    if result.is_err() {
        _ = fs::remove_dir_all(&cef_dir);
        return result;
    }

    Ok(())
}

#[tauri::command]
pub async fn launch_cef(app_handle: tauri::AppHandle) -> Result<String, String> {
    let (cef_dir, cef_cache) = get_cef_paths(&app_handle)?;

    let temp_cef_dir = std::env::temp_dir().join("huly-cef");
    _ = fs::remove_dir_all(&temp_cef_dir);
    copy_dir_all(&cef_dir, &temp_cef_dir).map_err(|e| format!("failed to copy CEF: {e}"))?;

    let cef_exe = temp_cef_dir.join(CEF_EXE);

    let port = find_available_port().map_err(|e| format!("couldn't find available port: {e}"))?;
    let mut command = Command::new(cef_exe);
    command
        .args(["--port", &port.to_string()])
        .args(["--cache-path", cef_cache.to_str().unwrap()]);

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }

    command.spawn().map_err(|e| {
        format!("failed to launch CEF with params port {port} cache-dir {cef_cache:?}: {e}")
    })?;

    wait_for_cef(port).map_err(|e| {
        format!("CEF failed to start with params port {port} cache-dir {cef_cache:?}: {e}")
    })?;

    let address = format!("ws://localhost:{port}/browser");
    let (ws, _) = tungstenite::connect(address.clone())
        .map_err(|e| format!("failed to connect to CEF: {e}"))?;

    app_handle
        .state::<Arc<Mutex<BrowserState>>>()
        .lock()
        .unwrap()
        .cef_connection = Some(ws);

    Ok(address)
}
