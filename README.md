# Setting Up Huly CEF with Tauri

Follow these steps to configure and launch the Huly CEF browser using Tauri.

## 1. Define the Environment Variable for Huly CEF

Set the environment variable `HULY_CEF` to point to your local Huly CEF repository. This will copy the necessary Huly CEF binaries into the Tauri resources folder.

```bash
export HULY_CEF=/path/to/huly/cef
```

## 2. Install Node Modules

Use npm to install the required dependencies.

```bash
npm install
```

## 3. Launch the Tauri App

Start the Tauri development environment to launch the browser.

```bash
npm run tauri dev
```