import { ServiceError } from '@lowerdeck/error';
import { createApiServiceError, normalizeOAuthTokenResponse } from 'slates';
import { z } from 'zod';

export let amplitudeRegionSchema = z.enum(['US', 'EU']);
export type AmplitudeOAuthRegion = z.infer<typeof amplitudeRegionSchema>;

export let getAmplitudeOAuthOrigin = (region: AmplitudeOAuthRegion) =>
  region === 'EU' ? 'https://auth.eu.amplitude.com' : 'https://auth.amplitude.com';

// Fixed provider origins prevent connection input from redirecting credentials.
let requestAmplitudeOAuthToken = async (
  region: AmplitudeOAuthRegion,
  body: URLSearchParams
): Promise<unknown> => {
  try {
    let response = await fetch(`${getAmplitudeOAuthOrigin(region)}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString(),
      redirect: 'error',
      signal: AbortSignal.timeout(30_000)
    });
    if (!response.ok) {
      // OAuth responses may contain credentials. Expose status, never raw bodies.
      throw createApiServiceError(
        `Amplitude OAuth token exchange failed (HTTP ${response.status}). Reconnect your Amplitude account.`,
        { reason: 'amplitude_oauth_error' }
      );
    }
    return await response.json();
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw createApiServiceError(
      'Could not complete Amplitude OAuth. Retry connecting your account.',
      {
        reason: 'amplitude_oauth_error'
      }
    );
  }
};

export let exchangeAmplitudeOAuthToken = async (
  region: AmplitudeOAuthRegion,
  params: URLSearchParams,
  previousRefreshToken?: string
) =>
  normalizeOAuthTokenResponse(await requestAmplitudeOAuthToken(region, params), {
    providerLabel: 'Amplitude',
    previousRefreshToken,
    refreshTokenFallbackMode: 'falsy',
    required: true
  });
