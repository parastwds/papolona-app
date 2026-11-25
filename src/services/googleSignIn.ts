import { TurboModuleRegistry } from 'react-native';
import type * as GoogleSignInModule from '@react-native-google-signin/google-signin';

type GoogleSignInLib = typeof GoogleSignInModule;

let lib: GoogleSignInLib | null | undefined;
let configured = false;

/**
 * The Google Sign-In library, or null when its native module isn't in this build
 * (Expo Go, or an install from before it was added). Importing it directly would
 * crash the whole app at startup there, so it is loaded on first use.
 */
function getLib(): GoogleSignInLib | null {
  if (lib === undefined) {
    // `get` (unlike the library's own `getEnforcing`) returns null instead of throwing.
    lib = TurboModuleRegistry.get('RNGoogleSignin')
      ? (require('@react-native-google-signin/google-signin') as GoogleSignInLib)
      : null;
  }
  return lib;
}

function getConfiguredClient() {
  const google = getLib();
  if (!google) {
    throw new Error(
      'Google sign-in needs the latest Papolona build. Rebuild the app and try again.',
    );
  }
  if (!configured) {
    const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    if (!webClientId) {
      throw new Error('Google sign-in is not set up in this build.');
    }
    // The Web client ID is the audience the backend checks the ID token against.
    google.GoogleSignin.configure({ webClientId });
    configured = true;
  }
  return google;
}

/**
 * Shows the Google account picker and returns the account's ID token,
 * or null if the user closed the picker.
 */
export async function getGoogleIdToken(): Promise<string | null> {
  const google = getConfiguredClient();
  const { GoogleSignin, isCancelledResponse, isErrorWithCode, statusCodes } =
    google;

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  let response;
  try {
    response = await GoogleSignin.signIn();
  } catch (error) {
    // A second tap while the picker is already open: ignore it.
    if (isErrorWithCode(error) && error.code === statusCodes.IN_PROGRESS) {
      return null;
    }
    throw new Error('Google sign-in failed. Please try again.');
  }
  if (isCancelledResponse(response)) return null;

  const idToken = response.data.idToken;
  if (!idToken) throw new Error('Google did not return an ID token.');
  return idToken;
}

/** Forgets the chosen Google account so the picker appears again next time. */
export async function signOutOfGoogle() {
  try {
    await getLib()?.GoogleSignin.signOut();
  } catch {
    // Not signed in to Google, or the module is missing: nothing to undo.
  }
}
