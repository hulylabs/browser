use anyhow::Result;

use std::{
    fs::{create_dir_all, File},
    io::{self, Cursor},
    path::Path,
};
#[cfg(target_os = "linux")]
const HULY_CEF_URL: &str =
    "https://github.com/hulylabs/huly-cef/releases/latest/download/linux-x86_64.zip";
#[cfg(target_os = "macos")]
const HULY_CEF_URL: &str =
    "https://github.com/hulylabs/huly-cef/releases/latest/download/macos-arm64.zip";
#[cfg(target_os = "windows")]
const HULY_CEF_URL: &str =
    "https://github.com/hulylabs/huly-cef/releases/latest/download/windows-x86_64.zip";

const HULY_CEF_FILE: &str = "huly-cef.zip";

fn download(dir: &Path) -> Result<()> {
    if dir.exists() {
        return Ok(());
    }

    create_dir_all(dir)?;
    let path = dir.join(HULY_CEF_FILE);

    let response = reqwest::blocking::get(HULY_CEF_URL)?;
    let mut file = File::create(path)?;
    let mut data = Cursor::new(response.bytes()?);
    io::copy(&mut data, &mut file)?;

    Ok(())
}

fn extract(filepath: &Path, dir: &Path) -> Result<()> {
    let file = File::open(filepath)?;
    zip::ZipArchive::new(file)?.extract(dir)?;

    Ok(())
}

fn main() -> Result<()> {
    let dir = Path::new("cef");
    let file = dir.join(HULY_CEF_FILE);
    download(dir)?;
    extract(&file, dir)?;

    tauri_build::build();

    Ok(())
}
