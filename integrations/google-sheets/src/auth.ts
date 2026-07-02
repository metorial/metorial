import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { googleSheetsScopes } from './scopes';

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
        title: 'Spreadsheets (Full)',
        description: 'Full read/write access to all spreadsheets',
        scope: googleSheetsScopes.spreadsheets
      },
      {
        title: 'Spreadsheets (Read)',
        description: 'Read-only access to all spreadsheets',
        scope: googleSheetsScopes.spreadsheetsReadonly
      },
      {
        title: 'Drive (Full)',
        description:
          'Full access to Google Drive, needed for creating/deleting spreadsheets and push notifications',
        scope: googleSheetsScopes.drive
      },
      {
        title: 'Drive (Read)',
        description: 'Read-only access to Google Drive files',
        scope: googleSheetsScopes.driveReadonly
      },
      {
        title: 'Drive (App Files)',
        description: 'Access only to files created or opened by the app',
        scope: googleSheetsScopes.driveFile
      },
      {
        title: 'User Profile',
        description: 'View basic profile information',
        scope: googleSheetsScopes.userInfoProfile
      },
      {
        title: 'User Email',
        description: 'View email address',
        scope: googleSheetsScopes.userInfoEmail
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        state: ctx.state,
        scope: ctx.scopes.join(' '),
        access_type: 'offline',
        prompt: 'consent'
      });

      return {
        url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let axios = createAxios();

      let response = await axios.post(
        'https://oauth2.googleapis.com/token',
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

      let axios = createAxios();

      let response = await axios.post(
        'https://oauth2.googleapis.com/token',
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
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt
        }
      };
    },

    getProfile: async (ctx: any) => {
      let axios = createAxios();

      let response = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
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
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      token: z.string().describe('Google API Key for read-only access to public spreadsheets')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  })
  .addServiceAccountAuth({
    type: 'auth.service_account',
    name: 'Service Account',
    key: 'service_account',

    inputSchema: z.object({
      serviceAccountJson: z.string().describe('Service account JSON key file contents')
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
        scope:
          'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now
      };

      let claim = btoa(JSON.stringify(claimSet))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      let signInput = `${header}.${claim}`;

      let pemContent = serviceAccount.private_key
        .replace(/-----BEGIN PRIVATE KEY-----/g, '')
        .replace(/-----END PRIVATE KEY-----/g, '')
        .replace(/\s/g, '');

      let binaryDer = atob(pemContent);
      let derArray = new Uint8Array(binaryDer.length);
      for (let i = 0; i < binaryDer.length; i++) {
        derArray[i] = binaryDer.charCodeAt(i);
      }

      let privateKey = await crypto.subtle.importKey(
        'pkcs8',
        derArray.buffer,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['sign']
      );

      let encoder = new TextEncoder();
      let signatureBuffer = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        privateKey,
        encoder.encode(signInput)
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

      let jwt = `${signInput}.${signature}`;

      let axios = createAxios();

      let response = await axios.post(
        'https://oauth2.googleapis.com/token',
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
    },

    getProfile: async (ctx: any) => {
      let serviceAccount = JSON.parse(ctx.input.serviceAccountJson);
      return {
        profile: {
          id: serviceAccount.client_id,
          email: serviceAccount.client_email,
          name: serviceAccount.project_id
        }
      };
    }
  });
