import {
  createApiServiceError,
  createAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { computeEngineOAuthError } from './lib/errors';
import { computeEngineScopes } from './scopes';

let googleOAuthAxios = createAxios({
  baseURL: 'https://oauth2.googleapis.com'
});

let googleProfileAxios = createAxios({
  baseURL: 'https://www.googleapis.com'
});

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let parseGrantedScopes = (data: unknown) => {
  if (!isRecord(data) || typeof data.scope !== 'string') return undefined;
  return data.scope.split(' ').filter(Boolean);
};

let parseServiceAccountJson = (raw: string) => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw createApiServiceError('Service account JSON must be valid JSON.', {
      reason: 'compute_engine_auth_error',
      parent: error
    });
  }

  if (!isRecord(parsed)) {
    throw createApiServiceError('Service account JSON must be an object.', {
      reason: 'compute_engine_auth_error'
    });
  }

  let clientEmail = parsed.client_email;
  let privateKey = parsed.private_key;
  let clientId = parsed.client_id;
  let projectId = parsed.project_id;

  if (typeof clientEmail !== 'string' || !clientEmail.trim()) {
    throw createApiServiceError('Service account JSON must include client_email.', {
      reason: 'compute_engine_auth_error'
    });
  }

  if (typeof privateKey !== 'string' || !privateKey.trim()) {
    throw createApiServiceError('Service account JSON must include private_key.', {
      reason: 'compute_engine_auth_error'
    });
  }

  return {
    clientEmail: clientEmail.trim(),
    privateKey,
    clientId: typeof clientId === 'string' && clientId.trim() ? clientId.trim() : undefined,
    projectId: typeof projectId === 'string' && projectId.trim() ? projectId.trim() : undefined
  };
};

let toBase64Url = (value: string) =>
  btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

let bytesToBase64Url = (value: Uint8Array) => {
  let binary = '';
  for (let byte of value) binary += String.fromCharCode(byte);
  return toBase64Url(binary);
};

let createServiceAccountAssertion = async (clientEmail: string, privateKey: string) => {
  let now = Math.floor(Date.now() / 1000);
  let header = toBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  let payload = toBase64Url(
    JSON.stringify({
      iss: clientEmail,
      scope: computeEngineScopes.compute,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600
    })
  );
  let signingInput = `${header}.${payload}`;

  let pemContents = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');
  let binaryKey = atob(pemContents);
  let keyBytes = Uint8Array.from(binaryKey, character => character.charCodeAt(0));
  let cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBytes.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  let signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  return `${signingInput}.${bytesToBase64Url(new Uint8Array(signature))}`;
};

let formHeaders = {
  'Content-Type': 'application/x-www-form-urlencoded'
};

let exchangeServiceAccountToken = async (serviceAccountJson: string, operation: string) => {
  let { clientEmail, privateKey } = parseServiceAccountJson(serviceAccountJson);
  let assertion = await createServiceAccountAssertion(clientEmail, privateKey);
  let response = await googleOAuthAxios.post(
    '/token',
    new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    }).toString(),
    { headers: formHeaders }
  );
  let token = normalizeOAuthTokenResponse(response.data, {
    providerLabel: 'Compute Engine',
    operation,
    required: true,
    expiresInType: 'number'
  });

  return {
    output: {
      token: token.token,
      expiresAt: token.expiresAt
    },
    scopes: [computeEngineScopes.compute]
  };
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'Google OAuth',
    key: 'google_oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://support.google.com/cloud/answer/15544987'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developers.google.com/identity/protocols/oauth2/scopes'
      }
    ],
    scopes: [
      {
        title: 'Compute Engine Full Access',
        description: 'View and manage Google Compute Engine resources.',
        scope: computeEngineScopes.compute,
        defaultChecked: true
      },
      {
        title: 'Compute Engine Read Only',
        description: 'View Google Compute Engine resources.',
        scope: computeEngineScopes.computeReadonly
      },
      {
        title: 'Cloud Platform Full Access',
        description: 'View and manage resources across Google Cloud services.',
        scope: computeEngineScopes.cloudPlatform
      },
      {
        title: 'Google Account Profile',
        description: 'View your basic Google Account profile for connection identity.',
        scope: computeEngineScopes.userinfoProfile,
        defaultChecked: true
      },
      {
        title: 'Google Account Email',
        description: 'View your Google Account email address for connection identity.',
        scope: computeEngineScopes.userinfoEmail,
        defaultChecked: true
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        scope: ctx.scopes.join(' '),
        state: ctx.state,
        access_type: 'offline',
        prompt: 'consent'
      });

      return {
        url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      try {
        let response = await googleOAuthAxios.post(
          '/token',
          new URLSearchParams({
            code: ctx.code,
            client_id: ctx.clientId,
            client_secret: ctx.clientSecret,
            redirect_uri: ctx.redirectUri,
            grant_type: 'authorization_code'
          }).toString(),
          { headers: formHeaders }
        );
        let token = normalizeOAuthTokenResponse(response.data, {
          providerLabel: 'Compute Engine',
          operation: 'token exchange',
          required: true,
          expiresInType: 'number'
        });

        return {
          output: token,
          scopes: parseGrantedScopes(response.data)
        };
      } catch (error) {
        throw computeEngineOAuthError('authorization code exchange', error);
      }
    },

    handleTokenRefresh: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      clientId: string;
      clientSecret: string;
    }) => {
      if (!ctx.output.refreshToken) {
        throw createApiServiceError(
          'No refresh token is available for Google Compute Engine OAuth.',
          { reason: 'compute_engine_auth_error' }
        );
      }

      try {
        let response = await googleOAuthAxios.post(
          '/token',
          new URLSearchParams({
            refresh_token: ctx.output.refreshToken,
            client_id: ctx.clientId,
            client_secret: ctx.clientSecret,
            grant_type: 'refresh_token'
          }).toString(),
          { headers: formHeaders }
        );
        let token = normalizeOAuthTokenResponse(response.data, {
          providerLabel: 'Compute Engine',
          operation: 'token refresh',
          previousRefreshToken: ctx.output.refreshToken,
          refreshTokenFallbackMode: 'falsy',
          required: true,
          expiresInType: 'number'
        });

        return { output: token };
      } catch (error) {
        throw computeEngineOAuthError('token refresh', error);
      }
    },

    getProfile: async (ctx: { output: { token: string }; input: {}; scopes: string[] }) => {
      let canReadProfile =
        ctx.scopes.includes(computeEngineScopes.userinfoProfile) ||
        ctx.scopes.includes(computeEngineScopes.userinfoEmail);
      if (!canReadProfile) return { profile: {} };

      try {
        let response = await googleProfileAxios.get('/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${ctx.output.token}` }
        });
        let data = response.data;

        return {
          profile: {
            id: data.id,
            email: data.email,
            name: data.name,
            imageUrl: data.picture
          }
        };
      } catch (error) {
        throw computeEngineOAuthError('profile lookup', error);
      }
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Service Account',
    key: 'service_account',
    docs: [
      {
        type: 'docs.auth.service_account',
        name: 'Service account OAuth documentation',
        url: 'https://developers.google.com/identity/protocols/oauth2/service-account'
      }
    ],
    inputSchema: z.object({
      serviceAccountJson: z
        .string()
        .describe('Contents of a Google Cloud service account JSON key file')
    }),

    getOutput: async ctx => {
      try {
        return await exchangeServiceAccountToken(
          ctx.input.serviceAccountJson,
          'service account token exchange'
        );
      } catch (error) {
        throw computeEngineOAuthError('service account token exchange', error);
      }
    },

    handleTokenRefresh: async (ctx: { input: { serviceAccountJson: string } }) => {
      try {
        let result = await exchangeServiceAccountToken(
          ctx.input.serviceAccountJson,
          'service account token refresh'
        );
        return { output: result.output };
      } catch (error) {
        throw computeEngineOAuthError('service account token refresh', error);
      }
    },

    getProfile: async (ctx: { input: { serviceAccountJson: string } }) => {
      let serviceAccount = parseServiceAccountJson(ctx.input.serviceAccountJson);
      return {
        profile: {
          id: serviceAccount.clientId ?? serviceAccount.clientEmail,
          email: serviceAccount.clientEmail,
          name: serviceAccount.projectId ?? serviceAccount.clientEmail
        }
      };
    }
  });
