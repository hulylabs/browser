# Running Huly Browser

Follow these steps to configure and launch the Huly Browser.

## 1. Install Node Modules

Use npm to install the required dependencies.

```bash
npm install
```

## 2. Launch the Tauri App

Start the Tauri development environment to launch the browser.

```bash
npm run tauri dev
```

## Huly Browser Arguments

| Argument | Environment Variable | Default Value | Description |
|:--------:|:--------------------:|:-------------:|:-----------:|
| `--cef` | `CEF` | `` | Address to a standalone Huly CEF instance. Optional, used when profiles are disabled for debugging  |
| `--profiles-enabled` | `PROFILES_ENABLED` | `false` | Enables browser profiles functionality |
| `--cef-manager` | `CEF_MANAGER` | `http://localhost:3000` | Address to Huly CEF Manager. Used when profiles are enabled. |


