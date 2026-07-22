import { buildApiServiceError, createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import {
  assertLookerAuthenticatedInstanceUrl,
  buildLookerApiBaseUrl,
  normalizeLookerInstanceUrl,
  resolveLookerInstanceUrl
} from './lib/instance-url';

type LookerAuthInput = {
  clientId: string;
  clientSecret: string;
  instanceUrl?: string;
};

type LookerAuthContext = {
  input: LookerAuthInput;
  output?: LookerAuthOutput;
  config?: Record<string, unknown>;
};

type LookerAuthOutput = {
  token: string;
  expiresAt?: string;
  authenticatedInstanceUrl?: string;
};

type LookerProfileContext = LookerAuthContext & {
  output: LookerAuthOutput;
};

let invalidAuthResponse = () =>
  createApiServiceError('Looker returned an invalid authentication response.', {
    reason: 'looker_auth_response_invalid'
  });

let invalidProfileResponse = () =>
  createApiServiceError('Looker returned an invalid user profile.', {
    reason: 'looker_profile_response_invalid'
  });

let redactedUpstreamError = ({
  operation,
  reason,
  message,
  status
}: {
  operation: string;
  reason: 'looker_login_failed' | 'looker_refresh_failed' | 'looker_profile_failed';
  message: string;
  status?: number;
}) =>
  buildApiServiceError(status === undefined ? {} : { response: { status } }, {
    providerLabel: 'Looker',
    operation,
    reason,
    extractMessage: () => message
  });

let resolveAuthenticatedInstanceUrl = (ctx: LookerAuthContext) => {
  let hasStoredBinding = ctx.output?.authenticatedInstanceUrl !== undefined;
  let currentInstanceUrl = !hasStoredBinding
    ? resolveLookerInstanceUrl({
        configInstanceUrl: ctx.config?.instanceUrl,
        legacyAuthInstanceUrl: ctx.input.instanceUrl
      })
    : // Production auth stacks never receive provider config, so refresh and
      // profile calls must fall back to the instance the token was issued for.
      normalizeLookerInstanceUrl(
        ctx.config?.instanceUrl ??
          ctx.input.instanceUrl ??
          ctx.output?.authenticatedInstanceUrl
      );

  return assertLookerAuthenticatedInstanceUrl({
    currentInstanceUrl,
    authenticatedInstanceUrl: ctx.output?.authenticatedInstanceUrl
  });
};

let parseLoginResponse = (data: unknown): LookerAuthOutput => {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw invalidAuthResponse();
  }

  let response = data as Record<string, unknown>;
  let token = response.access_token;
  let expiresIn = response.expires_in;

  if (
    typeof token !== 'string' ||
    token.trim() === '' ||
    typeof expiresIn !== 'number' ||
    !Number.isFinite(expiresIn) ||
    expiresIn <= 0
  ) {
    throw invalidAuthResponse();
  }

  let expiresAtMilliseconds = Date.now() + expiresIn * 1000;
  if (!Number.isFinite(expiresAtMilliseconds)) {
    throw invalidAuthResponse();
  }

  let expiresAt = new Date(expiresAtMilliseconds);
  if (Number.isNaN(expiresAt.getTime())) {
    throw invalidAuthResponse();
  }

  return {
    token,
    expiresAt: expiresAt.toISOString()
  };
};

let exchangeCredentials = async (
  ctx: LookerAuthContext,
  operation: string,
  reason: 'looker_login_failed' | 'looker_refresh_failed'
) => {
  let instanceUrl = resolveAuthenticatedInstanceUrl(ctx);
  let response: Response;

  try {
    let form = new URLSearchParams({
      client_id: ctx.input.clientId,
      client_secret: ctx.input.clientSecret
    });
    response = await fetch(`${buildLookerApiBaseUrl(instanceUrl)}/login`, {
      method: 'POST',
      body: form.toString(),
      redirect: 'error',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
  } catch {
    throw redactedUpstreamError({
      operation,
      reason,
      message: 'The authentication request was rejected.'
    });
  }

  if (!response.ok) {
    throw redactedUpstreamError({
      operation,
      reason,
      message: 'The authentication request was rejected.',
      status: response.status
    });
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw invalidAuthResponse();
  }

  return {
    ...parseLoginResponse(data),
    authenticatedInstanceUrl: instanceUrl
  };
};

let profileId = (value: unknown) => {
  if (typeof value === 'string' && value.trim() !== '') {
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  throw invalidProfileResponse();
};

let optionalProfileText = (value: unknown) =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().min(1),
      expiresAt: z.string().optional(),
      authenticatedInstanceUrl: z.string().optional()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key Credentials',
    key: 'api_key',

    inputSchema: z.object({
      clientId: z
        .string()
        .refine(value => value.trim() !== '', 'Looker API client ID is required.')
        .describe('Looker API client ID'),
      clientSecret: z
        .string()
        .refine(value => value.trim() !== '', 'Looker API client secret is required.')
        .describe('Looker API client secret'),
      instanceUrl: z
        .string()
        .refine(value => value.trim() !== '', 'Looker instance URL is required.')
        .describe(
          'Looker instance URL (e.g., https://mycompany.cloud.looker.com). Must point to the same instance as the URL in the integration configuration.'
        )
    }),

    getOutput: async ctx => ({
      output: await exchangeCredentials(ctx, 'login', 'looker_login_failed')
    }),

    handleTokenRefresh: async (ctx: LookerAuthContext) => ({
      output: await exchangeCredentials(ctx, 'token refresh', 'looker_refresh_failed')
    }),

    getProfile: async (ctx: LookerProfileContext) => {
      let instanceUrl = resolveAuthenticatedInstanceUrl(ctx);
      let response: Response;

      try {
        response = await fetch(`${buildLookerApiBaseUrl(instanceUrl)}/user`, {
          redirect: 'error',
          headers: {
            Authorization: `token ${ctx.output.token}`
          }
        });
      } catch {
        throw redactedUpstreamError({
          operation: 'load user profile',
          reason: 'looker_profile_failed',
          message: 'The user profile request was rejected.'
        });
      }

      if (!response.ok) {
        throw redactedUpstreamError({
          operation: 'load user profile',
          reason: 'looker_profile_failed',
          message: 'The user profile request was rejected.',
          status: response.status
        });
      }

      let data: unknown;
      try {
        data = await response.json();
      } catch {
        throw invalidProfileResponse();
      }

      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        throw invalidProfileResponse();
      }

      let user = data as Record<string, unknown>;
      let id = profileId(user.id);
      let email = optionalProfileText(user.email);
      let name =
        optionalProfileText(user.display_name) ??
        ([optionalProfileText(user.first_name), optionalProfileText(user.last_name)]
          .filter((part): part is string => part !== undefined)
          .join(' ') ||
          email ||
          id);

      return {
        profile: {
          id,
          ...(email === undefined ? {} : { email }),
          name
        }
      };
    }
  });
