# Papolona

Papolona is a React Native mobile app using Expo. The app is in a **bare Expo** setup: Expo and Expo's Metro configuration power the development workflow, while the `android/` and `ios/` native projects remain in the repository for native builds and platform-specific configuration.

## Requirements

- Node.js 22.11 or newer
- npm (for dependency installation and `npx`)
- Android Studio and an emulator/device for Android development
- macOS with Xcode for local iOS builds

Install the JavaScript dependencies from the project root:

```sh
npm install
```

## Run the app

Start the Expo development server:

```sh
npx expo start
```

Then use the Expo CLI prompts to open the app on a connected device or in a configured simulator. You can also launch a platform directly:

```sh
npx expo run:android
npx expo run:ios
```

The Android and iOS commands build and launch the native app through Expo's run commands. iOS builds require macOS and Xcode. If you change native dependencies or native project configuration, install iOS pods from the `ios/` directory as needed:

```sh
npx pod-install
```

## Project configuration

- `App.tsx` is the app entry component; `index.js` registers it with Expo.
- `app.json` contains the current Expo app configuration.
- `babel.config.js` uses `babel-preset-expo` and configures the `@` and `@assets` aliases.
- `metro.config.js` extends Expo's Metro defaults and enables SVG imports with `react-native-svg-transformer`.
- `android/` and `ios/` contain the native projects used for local native builds.

## Useful commands

```sh
npx expo start             # Start Expo/Metro
npx expo run:android       # Build and run on Android
npx expo run:ios           # Build and run on iOS (macOS only)
npx expo start --clear     # Restart with a cleared Metro cache
npx expo start --tunnel    # Start a tunnel that allows you to test app without being on same wifi
```

Linting and Jest are available through the npm scripts: `npm run lint` and `npm test`.

## Editing

Most app code lives in `src/`. Edit the relevant screen or component and Expo's development server will refresh the running app. Press `r` in the terminal to reload, or use the development menu on the device or simulator.

## Troubleshooting

- If Metro is serving stale files, stop the server and restart with `npx expo start --clear`.
- If Android cannot find the SDK, configure the Android SDK in Android Studio and ensure the local SDK path is available to Gradle.
- For iOS dependency or build issues, run `pod install` from `ios/` and open `ios/*.xcworkspace` in Xcode when you need to inspect the native project.

For Expo workflow details, see the [Expo documentation](https://docs.expo.dev/).
