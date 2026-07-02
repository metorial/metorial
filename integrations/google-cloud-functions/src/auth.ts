import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { googleCloudFunctionsScopes } from './scopes';

let googleAxios = createAxios({
  baseURL: 'https://oauth2.googleapis.com'
});

let userinfoAxios = createAxios({
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
        title: 'Cloud Platform',
        description: 'Full access to all Google Cloud resources including Cloud Functions',
        scope: googleCloudFunctionsScopes.cloudPlatform
      },
      {
        title: 'Cloud Platform Read-Only',
        description: 'Read-only access to Google Cloud resources',
        scope: googleCloudFunctionsScopes.cloudPlatformReadonly
      },
      {
        title: 'User Profile',
        description: 'View your basic profile information',
        scope: googleCloudFunctionsScopes.userinfoProfile
      },
      {
        title: 'User Email',
        description: 'View your email address',
        scope: googleCloudFunctionsScopes.userinfoEmail
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
      let response = await googleAxios.post(
        '/token',
        new URLSearchParams({
          code: ctx.code,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          redirect_uri: ctx.redirectUri,
          grant_type: 'authorization_code'
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
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

      let response = await googleAxios.post(
        '/token',
        new URLSearchParams({
          refresh_token: ctx.output.refreshToken,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'refresh_token'
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
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

    getProfile: async (ctx: { output: { token: string }; input: any; scopes: string[] }) => {
      let response = await userinfoAxios.get('/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
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
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Service Account JSON Key',
    key: 'service_account',

    inputSchema: z.object({
      serviceAccountJson: z
        .string()
        .describe('The full JSON key file content for the Google Cloud service account')
    }),

    getOutput: async ctx => {
      let serviceAccount = JSON.parse(ctx.input.serviceAccountJson);

      let header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      let now = Math.floor(Date.now() / 1000);
      let claimSet = {
        iss: serviceAccount.client_email,
        scope: googleCloudFunctionsScopes.cloudPlatform,
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600
      };

      let payload = btoa(JSON.stringify(claimSet))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      let signingInput = `${header}.${payload}`;

      let pemKey = serviceAccount.private_key;
      let pemContents = pemKey
        .replace(/-----BEGIN PRIVATE KEY-----/, '')
        .replace(/-----END PRIVATE KEY-----/, '')
        .replace(/\s/g, '');

      let binaryKey = atob(pemContents);
      let keyBuffer = new Uint8Array(binaryKey.length);
      for (let i = 0; i < binaryKey.length; i++) {
        keyBuffer[i] = binaryKey.charCodeAt(i);
      }

      let cryptoKey = await crypto.subtle.importKey(
        'pkcs8',
        keyBuffer.buffer,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['sign']
      );

      let encoder = new TextEncoder();
      let signatureBuffer = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        cryptoKey,
        encoder.encode(signingInput)
      );

      let signatureArray = new Uint8Array(signatureBuffer);
      let signatureStr = '';
      for (let i = 0; i < signatureArray.length; i++) {
        signatureStr += String.fromCharCode(signatureArray[i]!);
      }
      let signature = btoa(signatureStr)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      let jwt = `${signingInput}.${signature}`;

      let response = await googleAxios.post(
        '/token',
        new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwt
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
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
