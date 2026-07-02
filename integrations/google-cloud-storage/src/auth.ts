import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { googleCloudStorageScopes } from './scopes';

let googleAuth = createAxios({
  baseURL: 'https://oauth2.googleapis.com'
});

let googleApi = createAxios({
  baseURL: 'https://www.googleapis.com'
});

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
    name: 'OAuth',
    key: 'oauth',
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
        title: 'Read Only',
        description: 'Read data and list buckets',
        scope: googleCloudStorageScopes.devstorageReadOnly
      },
      {
        title: 'Read Write',
        description: 'Read and modify data, but not metadata like IAM policies',
        scope: googleCloudStorageScopes.devstorageReadWrite
      },
      {
        title: 'Full Control',
        description: 'Full control over data, including modifying IAM policies',
        scope: googleCloudStorageScopes.devstorageFullControl
      },
      {
        title: 'Cloud Platform',
        description: 'View and manage data across all Google Cloud services',
        scope: googleCloudStorageScopes.cloudPlatform
      },
      {
        title: 'User Profile',
        description: 'View your basic Google profile information',
        scope: googleCloudStorageScopes.userinfoProfile
      },
      {
        title: 'User Email',
        description: 'View your Google account email address',
        scope: googleCloudStorageScopes.userinfoEmail
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
      let response = await googleAuth.post(
        '/token',
        new URLSearchParams({
          code: ctx.code,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          redirect_uri: ctx.redirectUri,
          grant_type: 'authorization_code'
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      let data = response.data;

      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;
      let grantedScopes =
        typeof data.scope === 'string' ? data.scope.split(' ').filter(Boolean) : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt
        },
        scopes: grantedScopes
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw new Error('No refresh token available');
      }

      let response = await googleAuth.post(
        '/token',
        new URLSearchParams({
          refresh_token: ctx.output.refreshToken,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'refresh_token'
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      let data = response.data;

      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: ctx.output.refreshToken,
          expiresAt
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: {}; scopes: string[] }) => {
      let canReadProfile =
        ctx.scopes.includes(googleCloudStorageScopes.userinfoProfile) ||
        ctx.scopes.includes(googleCloudStorageScopes.userinfoEmail);

      if (!canReadProfile) {
        return {
          profile: {}
        };
      }

      try {
        let response = await googleApi.get('/oauth2/v2/userinfo', {
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
      } catch {
        return {
          profile: {}
        };
      }
    }
  })
  .addServiceAccountAuth({
    type: 'auth.service_account',
    name: 'Service Account',
    key: 'service_account',

    inputSchema: z.object({
      clientEmail: z.string().describe('Service account client email'),
      privateKey: z.string().describe('Service account private key (PEM format)'),
      scopes: z
        .string()
        .optional()
        .describe('Comma-separated list of OAuth scopes. Defaults to full-control scope.')
    }),

    getOutput: async ctx => {
      let scopes = ctx.input.scopes
        ? ctx.input.scopes.split(',').map(s => s.trim())
        : [googleCloudStorageScopes.devstorageFullControl];

      let now = Math.floor(Date.now() / 1000);
      let expiry = now + 3600;

      let header = { alg: 'RS256', typ: 'JWT' };
      let payload = {
        iss: ctx.input.clientEmail,
        scope: scopes.join(' '),
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: expiry
      };

      let encodedHeader = btoa(JSON.stringify(header))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      let encodedPayload = btoa(JSON.stringify(payload))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      let signingInput = `${encodedHeader}.${encodedPayload}`;

      let pemContent = ctx.input.privateKey
        .replace(/-----BEGIN (RSA )?PRIVATE KEY-----/, '')
        .replace(/-----END (RSA )?PRIVATE KEY-----/, '')
        .replace(/\s/g, '');

      let binaryString = atob(pemContent);
      let bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      let cryptoKey = await crypto.subtle.importKey(
        'pkcs8',
        bytes.buffer,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['sign']
      );

      let signatureBuffer = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        cryptoKey,
        new TextEncoder().encode(signingInput)
      );

      let signatureArray = new Uint8Array(signatureBuffer);
      let signatureBase64 = '';
      for (let i = 0; i < signatureArray.length; i++) {
        signatureBase64 += String.fromCharCode(signatureArray[i]!);
      }
      signatureBase64 = btoa(signatureBase64)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      let jwt = `${signingInput}.${signatureBase64}`;

      let response = await googleAuth.post(
        '/token',
        new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwt
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      let data = response.data;

      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: data.access_token,
          expiresAt
        }
      };
    }
  });
