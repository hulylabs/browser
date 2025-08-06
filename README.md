# Setting Up Huly CEF with Tauri

Follow these steps to configure and launch the Huly CEF browser using Tauri.

## 1. Download Huly CEF Archive

Download a necessary Huly CEF archive from the following link: [Huly CEF](https://github.com/hulylabs/huly-cef/releases/latest)


## 2. Put Huly CEF Archive to Tauri Resources

Copy the Huly CEF archive to `./src-tauri/cef` folder

## 3. Install Node Modules

Use npm to install the required dependencies.

```bash
npm install
```

## 4. Launch the Tauri App

Start the Tauri development environment to launch the browser.

```bash
export HULY_CEF_MANAGER_HOST=<huly-cef-manager-host>
npm run tauri dev
```