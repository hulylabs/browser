use std::path::{Path, PathBuf};
use std::{fs, io};

const HULY_CEF: &str = "HULY_CEF";

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

fn main() {
    let huly_cef_path = std::env::var(HULY_CEF).unwrap_or_else(|_| {
        panic!(
            "Please set the {} environment variable to the path of the cef directory",
            HULY_CEF
        );
    });
    let huly_cef_path = PathBuf::from(huly_cef_path).join("target/release");

    copy_dir_all(huly_cef_path, "cef").unwrap_or_else(|_| {
        panic!("Failed to copy huly cef artifacts");
    });

    tauri_build::build()
}
