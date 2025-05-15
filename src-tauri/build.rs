use anyhow::Result;

use std::{
    fs:: File,
    path::Path,
};
#[cfg(target_os = "linux")]
const HULY_CEF_PATH: &str = "cef/linux-x86_64.zip";
#[cfg(target_os = "macos")]
const HULY_CEF_PATH: &str = "cef/macos-arm64.zip";
#[cfg(target_os = "windows")]
const HULY_CEF_PATH: &str = "cef/windows-x86_64.zip";

fn extract(filepath: &Path) -> Result<()> {
    let file = File::open(filepath)?;
    zip::ZipArchive::new(file)?.extract( filepath.parent().unwrap())?;

    Ok(())
}

fn main() -> Result<()> {
    let file = Path::new(HULY_CEF_PATH);
    extract(&file).expect("Failed to extract Huly CEF");

    tauri_build::build();

    Ok(())
}
