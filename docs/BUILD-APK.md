# Build an installable Android APK (EAS Build)

An APK is a file you install on an Android phone like any other app, so you no longer need Expo Go, your PC or a hotspot.
Expo's cloud service (EAS Build) builds it for you; it needs a free Expo account.

The APK talks to your hosted backend (Render + Neon), so the phone needs internet.

## One-time setup
1. Create a free account at https://expo.dev
2. In PowerShell, in the `mobile` folder (inside your git repo, e.g. `tw-repo\mobile`):
   ```powershell
   npx eas-cli login
   npx eas-cli init
   ```
   `init` links this project to your Expo account (it adds a project id to `app.json`; accept the prompts).
3. Give the build your API key (it is *not* stored in git). Run and answer the prompts:
   ```powershell
   npx eas-cli env:create
   ```
   - Environment: **preview** (and again for **production** if you want store builds later)
   - Name: `EXPO_PUBLIC_API_KEY`
   - Value: the `API_KEY` from Render (Render → tech-wizard-api → Environment)
   - Visibility: the most private option it allows for this variable (`sensitive` if offered; plain text if not)

   The API URL and "no demo data" settings are already in `eas.json`.
4. Commit and push (EAS builds the code that is in git):
   ```powershell
   git add -A
   git commit -m "Add EAS build config"
   git push origin main
   ```

## Build
```powershell
npx eas-cli build --platform android --profile preview
```
- First time: when it asks **Generate a new Android Keystore?** answer **Yes** (Expo stores it for you; this key is what future updates must be signed with).
- The build runs in Expo's cloud (often 10-20 minutes; the free queue can be longer). Free accounts have a monthly build allowance.
- When it finishes you get a link and QR code to the **.apk**.

## Install on your phone
1. Open the link on the phone (or scan the QR code) and download the APK.
2. Android asks to allow installing apps from this source (your browser or Files): allow it, then tap **Install**.
3. Open **Tech Wizard**. No Expo Go, no PC needed.

## Updating the app later
Change the code, commit and push, then run the same build command again and install the new APK over the old one
(the package name `com.techwizard.app` and the stored keystore keep it an update, so your data - which lives on the server - is untouched).

## Good to know
- `EXPO_PUBLIC_*` values are compiled into the app, so the API key can be extracted from the APK by a determined person.
  For real multi-user use, add user logins.
- For the Google Play Store use `--profile production` (builds an `.aab`), which also needs a Play developer account.
- If a build fails, open the build page on expo.dev and read the "Run gradlew" section of the log, then ask for help with that text.
