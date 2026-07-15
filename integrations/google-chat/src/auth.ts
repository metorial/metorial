import {
  createApiServiceError,
  createAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { googleChatOAuthError } from './lib/errors';
import { googleChatScopes } from './scopes';

let googleOAuthAxios = createAxios({
  baseURL: 'https://oauth2.googleapis.com'
});

let googleProfileAxios = createAxios({
  baseURL: 'https://www.googleapis.com'
});

let formHeaders = {
  'Content-Type': 'application/x-www-form-urlencoded'
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let parseGrantedScopes = (data: unknown) => {
  if (!isRecord(data) || typeof data.scope !== 'string') return undefined;
  return data.scope.split(/\s+/).filter(Boolean);
};

let parseServiceAccountJson = (raw: string) => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw createApiServiceError('Service account JSON must be valid JSON.', {
      reason: 'google_chat_service_account_auth_error',
      parent: error
    });
  }

  if (!isRecord(parsed)) {
    throw createApiServiceError('Service account JSON must be an object.', {
      reason: 'google_chat_service_account_auth_error'
    });
  }

  let clientEmail = parsed.client_email;
  let privateKey = parsed.private_key;
  let clientId = parsed.client_id;
  let projectId = parsed.project_id;

  if (typeof clientEmail !== 'string' || !clientEmail.trim()) {
    throw createApiServiceError('Service account JSON must include client_email.', {
      reason: 'google_chat_service_account_auth_error'
    });
  }
  if (typeof privateKey !== 'string' || !privateKey.trim()) {
    throw createApiServiceError('Service account JSON must include private_key.', {
      reason: 'google_chat_service_account_auth_error'
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
      scope: googleChatScopes.bot,
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
  let cryptoKey = await crypto.subtle
    .importKey(
      'pkcs8',
      keyBytes.buffer,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    )
    .catch(error => {
      throw createApiServiceError('Service account private_key must be a valid PKCS#8 key.', {
        reason: 'google_chat_service_account_auth_error',
        parent: error
      });
    });
  let signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  return `${signingInput}.${bytesToBase64Url(new Uint8Array(signature))}`;
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
    providerLabel: 'Google Chat',
    operation,
    required: true,
    expiresInType: 'number'
  });

  return {
    output: {
      token: token.token,
      expiresAt: token.expiresAt
    },
    scopes: [googleChatScopes.bot]
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
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'Google OAuth documentation',
        url: 'https://developers.google.com/identity/protocols/oauth2/web-server'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'Google Chat OAuth scopes',
        url: 'https://developers.google.com/workspace/chat/authenticate-authorize'
      }
    ],
    scopes: [
      {
        title: 'Messages',
        description:
          'View, create, update, and delete Google Chat messages and manage reactions.',
        scope: googleChatScopes.messages,
        defaultChecked: true
      },
      {
        title: 'Messages (Read Only)',
        description: 'View Google Chat messages.',
        scope: googleChatScopes.messagesReadonly,
        defaultChecked: false
      },
      {
        title: 'Create Messages',
        description: 'Create Google Chat messages without broader message access.',
        scope: googleChatScopes.messagesCreate,
        defaultChecked: false
      },
      {
        title: 'Spaces',
        description: 'Create Google Chat spaces and view or edit their metadata.',
        scope: googleChatScopes.spaces,
        defaultChecked: false
      },
      {
        title: 'Spaces (Read Only)',
        description: 'View Google Chat spaces.',
        scope: googleChatScopes.spacesReadonly,
        defaultChecked: false
      },
      {
        title: 'Delete Spaces',
        description: 'Delete Google Chat spaces and remove access to associated files.',
        scope: googleChatScopes.delete,
        defaultChecked: false
      },
      {
        title: 'Memberships',
        description: 'View and manage Google Chat space memberships.',
        scope: googleChatScopes.memberships,
        defaultChecked: false
      },
      {
        title: 'Memberships (Read Only)',
        description: 'View Google Chat space memberships.',
        scope: googleChatScopes.membershipsReadonly,
        defaultChecked: false
      },
      {
        title: 'Chat Memberships (App)',
        description:
          'Add and remove the Chat app itself from Google Chat conversations and spaces.',
        scope: googleChatScopes.membershipsApp,
        defaultChecked: false
      },
      {
        title: 'Message Reactions',
        description: 'View, create, and delete reactions to Google Chat messages.',
        scope: googleChatScopes.messageReactions,
        defaultChecked: false
      },
      {
        title: 'Google Account Email',
        description: 'View the Google Account email address for connection identity.',
        scope: googleChatScopes.userInfoEmail,
        defaultChecked: true
      },
      {
        title: 'Google Account Profile',
        description: 'View the basic Google Account profile for connection identity.',
        scope: googleChatScopes.userInfoProfile,
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
          providerLabel: 'Google Chat',
          operation: 'token exchange',
          required: true,
          expiresInType: 'number'
        });

        return {
          output: token,
          scopes: parseGrantedScopes(response.data)
        };
      } catch (error) {
        throw googleChatOAuthError('authorization code exchange', error);
      }
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw createApiServiceError(
          'No refresh token is available for Google Chat OAuth. Reconnect Google Chat to restore offline access.',
          { reason: 'google_chat_missing_refresh_token' }
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
          providerLabel: 'Google Chat',
          operation: 'token refresh',
          previousRefreshToken: ctx.output.refreshToken,
          refreshTokenFallbackMode: 'falsy',
          required: true,
          expiresInType: 'number'
        });

        return { output: token };
      } catch (error) {
        throw googleChatOAuthError('token refresh', error);
      }
    },

    getProfile: async (ctx: { output: { token: string }; scopes: string[] }) => {
      let canReadProfile =
        ctx.scopes.includes(googleChatScopes.userInfoProfile) ||
        ctx.scopes.includes(googleChatScopes.userInfoEmail);
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
        throw googleChatOAuthError('profile lookup', error);
      }
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Google Chat App Service Account',
    key: 'service_account',
    docs: [
      {
        type: 'docs.auth.service_account',
        name: 'Google Chat app authentication',
        url: 'https://developers.google.com/workspace/chat/authenticate-authorize-chat-app'
      }
    ],
    inputSchema: z.object({
      serviceAccountJson: z
        .string()
        .describe(
          'Contents of the JSON key for the service account configured as this Google Chat app'
        )
    }),

    getOutput: async ctx => {
      try {
        return await exchangeServiceAccountToken(
          ctx.input.serviceAccountJson,
          'service account token exchange'
        );
      } catch (error) {
        throw googleChatOAuthError('service account token exchange', error);
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
        throw googleChatOAuthError('service account token refresh', error);
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
