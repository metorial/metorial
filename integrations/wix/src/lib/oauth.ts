import { createHmac, timingSafeEqual } from 'node:crypto';
import { createApiServiceError, createAxios, normalizeOAuthTokenResponse } from 'slates';
import { z } from 'zod';
import { wixApiError } from './errors';

export const INSTALL_WINDOW_MS = 15 * 60 * 1000;
const CLOCK_SKEW_MS = 60 * 1000;

const instanceSchema = z.object({
  instanceId: z.string().min(1),
  signDate: z.string(),
  uid: z.string().min(1),
  siteOwnerId: z.string().min(1),
  aid: z.string().optional()
});

// Wix signs the base64url data segment with the app secret. The unverified
// callback instanceId is never used to mint a token.
export let verifyInstalledInstance = (
  signedInstance: string,
  clientSecret: string,
  startedAt: number
) => {
  let parts = signedInstance.split('.');
  if (parts.length !== 2 || parts.some(part => !/^[A-Za-z0-9_-]+$/.test(part))) {
    throw createApiServiceError('Wix returned an invalid signed installation.');
  }
  let [signature, data] = parts as [string, string];
  let suppliedSignature = Buffer.from(signature, 'base64url');
  let expectedSignature = createHmac('sha256', clientSecret).update(data).digest();
  if (
    suppliedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(suppliedSignature, expectedSignature)
  ) {
    throw createApiServiceError('Wix installation signature verification failed.');
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
  } catch {
    throw createApiServiceError('Wix returned invalid installation data.');
  }
  let parsed = instanceSchema.safeParse(decoded);
  if (!parsed.success) {
    throw createApiServiceError(
      'Wix installation did not include authenticated site owner details.'
    );
  }
  let instance = parsed.data;
  let signedAt = Date.parse(instance.signDate);
  let now = Date.now();
  if (
    !Number.isFinite(startedAt) ||
    !Number.isFinite(signedAt) ||
    startedAt > now ||
    now - startedAt > INSTALL_WINDOW_MS ||
    signedAt < startedAt - CLOCK_SKEW_MS ||
    signedAt > now + CLOCK_SKEW_MS
  ) {
    throw createApiServiceError('Wix installation expired. Start connecting again.');
  }
  if (instance.aid || instance.uid !== instance.siteOwnerId) {
    throw createApiServiceError('Connect Wix while signed in as the site owner.');
  }
  return instance.instanceId;
};

export let createInstanceToken = async (
  clientId: string,
  clientSecret: string,
  instanceId: string
) => {
  let response: { data: unknown };
  try {
    response = await createAxios({ baseURL: 'https://www.wixapis.com' }).post(
      '/oauth2/token',
      {
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        instance_id: instanceId
      }
    );
  } catch (error) {
    throw wixApiError(error, 'create installation access token');
  }
  return normalizeOAuthTokenResponse(response.data, { providerLabel: 'Wix', required: true });
};
