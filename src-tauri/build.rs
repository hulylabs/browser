use std::{fs, io::Cursor, path::Path};

use zip::ZipArchive;

fn cef_url() -> String {
    let target_os = std::env::var("CARGO_CFG_TARGET_OS").unwrap_or_default();
    let target_arch = std::env::var("CARGO_CFG_TARGET_ARCH").unwrap_or_default();
    match (target_os.as_str(), target_arch.as_str()) {
        ("linux", _) => "https://github.com/hulylabs/huly-cef/releases/latest/download/huly-cef-linux.zip".to_string(),
        ("macos", "aarch64") => "https://github.com/hulylabs/huly-cef/releases/latest/download/huly-cef-macos-arm64.zip".to_string(),
        ("macos", "x86_64") => "https://github.com/hulylabs/huly-cef/releases/latest/download/huly-cef-macos-x86_64.zip".to_string(),
        ("windows", _) => "https://github.com/hulylabs/huly-cef/releases/latest/download/huly-cef-windows.zip".to_string(),
        _ => panic!("Unsupported platform: {}-{}", target_os, target_arch),
    }
}

const CEF_RESOURCE_PATH: &str = "cef";

fn main() {
    let cef_url = cef_url();
    if !compare_checksums(&cef_url).unwrap_or(false) {
        println!("cargo:error=Downloading CEF from {cef_url}");
        if let Err(e) = download_and_extract(CEF_RESOURCE_PATH, &cef_url) {
            println!("cargo:error=Error downloading and extracting CEF: {}", e);
            _ = fs::remove_dir_all(CEF_RESOURCE_PATH);
            std::process::exit(1);
        }
    }
    tauri_build::build();
}

fn compare_checksums(cef_url: &str) -> anyhow::Result<bool> {
    let existing = fs::read_to_string(format!("{}/checksum", CEF_RESOURCE_PATH))?;
    let new = download_checksum(cef_url)?;
    Ok(existing == new)
}

fn download_and_extract(dir: impl AsRef<Path>, cef_url: &str) -> anyhow::Result<()> {
    _ = fs::remove_dir_all(&dir);
    fs::create_dir_all(&dir)?;

    let data = reqwest::blocking::get(cef_url)?.bytes()?.to_vec();
    ZipArchive::new(Cursor::new(data))?.extract(&dir)?;

    let checksum = download_checksum(cef_url)?;
    fs::write(dir.as_ref().join("checksum"), checksum)?;

    Ok(())
}

fn download_checksum(cef_url: &str) -> anyhow::Result<String> {
    let checksum = reqwest::blocking::get(format!("{}.sha256", cef_url))?.text()?;
    Ok(checksum)
}
