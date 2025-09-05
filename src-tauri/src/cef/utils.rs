use std::{
    fs,
    io::{self, Cursor},
    net::TcpListener,
    path::{Path, PathBuf},
};

use tauri::Manager;
use tungstenite::connect;
use zip::ZipArchive;

pub fn copy_dir_all(src: impl AsRef<Path>, dst: impl AsRef<Path>) -> io::Result<()> {
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

pub fn get_cef_paths(app_handle: &tauri::AppHandle) -> Result<(PathBuf, PathBuf), String> {
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

pub fn wait_for_cef(port: u16) -> Result<(), String> {
    for _ in 0..10 {
        std::thread::sleep(std::time::Duration::from_millis(500));
        if connect(format!("ws://localhost:{}", port)).is_ok() {
            return Ok(());
        }
    }

    Err("CEF healthcheck failed".into())
}

pub fn find_available_port() -> Result<u16, String> {
    for port in 10000..50000 {
        if let Ok(_) = TcpListener::bind(format!("0.0.0.0:{}", port)) {
            return Ok(port);
        }
    }
    Err("No available ports found".into())
}

pub fn compare_checksums(url: &str, checksum_path: impl AsRef<Path>) -> Result<bool, String> {
    let Ok(existing) = fs::read_to_string(checksum_path) else {
        return Ok(false);
    };
    let new = download_checksum(url)?;

    Ok(existing == new)
}

pub fn download_checksum(url: &str) -> Result<String, String> {
    let checksum = reqwest::blocking::get(format!("{url}.sha256"))
        .map_err(|e| format!("failed to download checksum: {e}"))?
        .text()
        .map_err(|e| format!("failed to download checksum: {e}"))?;
    Ok(checksum)
}

pub fn download_and_extract(url: &str, dir: impl AsRef<Path>) -> Result<(), String> {
    _ = fs::remove_dir_all(&dir);
    fs::create_dir_all(&dir).map_err(|e| format!("failed to create CEF dir: {e}"))?;

    let data = reqwest::blocking::get(url)
        .and_then(|r| r.bytes())
        .and_then(|b| Ok(b.to_vec()))
        .map_err(|e| format!("failed to download CEF: {e}"))?;

    ZipArchive::new(Cursor::new(data))
        .and_then(|mut archive| archive.extract(&dir))
        .map_err(|e| {
            format!(
                "failed to extract CEF archive to {}: {e}",
                dir.as_ref().display()
            )
        })?;

    let checksum = download_checksum(url)?;
    fs::write(dir.as_ref().join("checksum"), checksum)
        .map_err(|e| format!("failed to save checksum: {e}"))?;

    Ok(())
}
