import { Platform } from 'react-native';

// Set EXPO_PUBLIC_API_URL in .env to reach the backend from a physical phone.
// The fallback keeps local emulator/simulator development convenient.
const DEFAULT_API_BASE_URL = `http://${
  Platform.OS === 'android' ? '10.0.2.2' : 'localhost'
}:4000/api/v1`;
// LOCAL TESTING: the hosted backend is switched off so the app uses the local
// one. To go back, use the commented line (and uncomment EXPO_PUBLIC_API_URL in .env).
// const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, '');
const API_BASE_URL = DEFAULT_API_BASE_URL;

export type ApiError = Error & { code?: string; status?: number };

export class ApiRequestError extends Error {
  code?: string;
  status: number;
  details?: unknown;

  constructor(
    message: string,
    status: number,
    code?: string,
    details?: unknown,
  ) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** Message to show for a failed request; validation errors carry the useful, field-level text in `details`. */
export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiRequestError && Array.isArray(error.details)) {
    const fieldMessage = (error.details[0] as { message?: string })?.message;
    if (fieldMessage) return fieldMessage;
  }
  return error instanceof Error ? error.message : fallback;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;
  const isFormData =
    typeof FormData !== 'undefined' && options.body instanceof FormData;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(!isFormData && { 'Content-Type': 'application/json' }),
        'X-Platform': Platform.OS,
        ...options.headers,
      },
    });
  } catch (error) {
    // expo/fetch reports transport failures as "fetch failed: ..."; anything
    // else was thrown while building the request (e.g. encoding the body).
    const message = error instanceof Error ? error.message : String(error);
    if (!/^fetch failed|network request failed/i.test(message)) {
      throw new ApiRequestError(
        `Could not prepare the request: ${message}`,
        0,
        'REQUEST_ERROR',
      );
    }
    throw new ApiRequestError(
      `Could not reach Papolona at ${API_BASE_URL}. Check that the backend is running and the app can reach this address.`,
      0,
      'NETWORK_ERROR',
      message,
    );
  }

  const payload = (await response.json().catch(() => null)) as {
    success?: boolean;
    data?: T;
    error?: { code?: string; message?: string; details?: unknown };
  } | null;

  if (!response.ok || !payload?.success) {
    throw new ApiRequestError(
      payload?.error?.message || `Request failed (${response.status}).`,
      response.status,
      payload?.error?.code,
      payload?.error?.details,
    );
  }

  return payload.data as T;
}
