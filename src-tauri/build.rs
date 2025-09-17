use std::{fs, io::Cursor, path::Path};

use zip::ZipArchive;

#[cfg(target_os = "linux")]
const CEF_URL: &str =
    "https://github.com/hulylabs/huly-cef/releases/latest/download/huly-cef-linux.zip";
#[cfg(target_os = "macos")]
const CEF_URL: &str =
    "https://github.com/hulylabs/huly-cef/releases/latest/download/huly-cef-macos.zip";
#[cfg(target_os = "windows")]
const CEF_URL: &str =
    "https://github.com/hulylabs/huly-cef/releases/latest/download/huly-cef-windows.zip";

const CEF_RESOURCE_PATH: &str = "cef";

fn main() {
    // if !compare_checksums().unwrap_or(false) {
    //     if let Err(e) = download_and_extract(CEF_RESOURCE_PATH) {
    //         println!("cargo:error=Error downloading and extracting CEF: {}", e);
    //         _ = fs::remove_dir_all(CEF_RESOURCE_PATH);
    //         std::process::exit(1);
    //     }
    // }
    tauri_build::build();
}

fn compare_checksums() -> anyhow::Result<bool> {
    let existing = fs::read_to_string(format!("{CEF_RESOURCE_PATH}/checksum"))?;
    let new = download_checksum()?;

    Ok(existing == new)
}

fn download_and_extract(dir: impl AsRef<Path>) -> anyhow::Result<()> {
    _ = fs::remove_dir_all(&dir);
    fs::create_dir_all(&dir)?;

    let data = reqwest::blocking::get(CEF_URL)?.bytes()?.to_vec();
    ZipArchive::new(Cursor::new(data))?.extract(&dir)?;

    let checksum = download_checksum()?;
    fs::write(dir.as_ref().join("checksum"), checksum)?;

    Ok(())
}

fn download_checksum() -> anyhow::Result<String> {
    let checksum = reqwest::blocking::get(format!("{CEF_URL}.sha256"))?.text()?;
    Ok(checksum)
}
