import { useEffect, useRef } from 'react';
import { requireOptionalNativeModule } from 'expo';
import type {
  ExpoSpeechRecognitionModule as SpeechModuleInstance,
  ExpoSpeechRecognitionNativeEventMap,
} from 'expo-speech-recognition';

type SpeechModule = typeof SpeechModuleInstance;

/**
 * The native speech module, or null when it isn't compiled into the app
 * (e.g. Expo Go). Importing 'expo-speech-recognition' directly throws there,
 * which crashes the whole app at startup, so use this instead.
 */
export const speechModule = requireOptionalNativeModule<SpeechModule>(
  'ExpoSpeechRecognition',
);

/** Same as the package's useSpeechRecognitionEvent, but a no-op without the module. */
export function useSpeechEvent<
  K extends keyof ExpoSpeechRecognitionNativeEventMap,
>(
  eventName: K,
  listener: (event: ExpoSpeechRecognitionNativeEventMap[K]) => void,
) {
  const listenerRef = useRef(listener);

  useEffect(() => {
    listenerRef.current = listener;
  });

  useEffect(() => {
    if (!speechModule) return;
    const subscription = speechModule.addListener(eventName, ((
      event: ExpoSpeechRecognitionNativeEventMap[K],
    ) => listenerRef.current(event)) as never);
    return () => subscription.remove();
  }, [eventName]);
}
