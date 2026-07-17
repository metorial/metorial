import { axios, SlateAuth } from 'slates';
import { z } from 'zod';
import { bigQueryOAuthError, bigQueryServiceError } from './lib/errors';

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let parseServiceAccountJson = (raw: string) => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    let serviceError = bigQueryServiceError('Service account JSON must be valid JSON.');
    if (error instanceof Error) {
      serviceError.setParent(error);
    }
    throw serviceError;
  }

  if (!isRecord(parsed)) {
    throw bigQueryServiceError('Service account JSON must be an object.');
  }

  let clientEmail = parsed.client_email;
  let privateKey = parsed.private_key;

  if (typeof clientEmail !== 'string' || clientEmail.length === 0) {
    throw bigQueryServiceError('Service account JSON must include client_email.');
  }

  if (typeof privateKey !== 'string' || privateKey.length === 0) {
    throw bigQueryServiceError('Service account JSON must include private_key.');
  }

  return { clientEmail, privateKey };
};

let expiresAtFrom = (expiresIn: unknown) => {
  let seconds = typeof expiresIn === 'number' && Number.isFinite(expiresIn) ? expiresIn : 3600;
  return new Date(Date.now() + seconds * 1000).toISOString();
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
        title: 'BigQuery Full Access',
        description: 'View and manage your data in Google BigQuery',
        scope: 'https://www.googleapis.com/auth/bigquery'
      },
      {
        title: 'BigQuery Insert Data',
        description: 'Insert data into Google BigQuery',
        scope: 'https://www.googleapis.com/auth/bigquery.insertdata'
      },
      {
        title: 'BigQuery Read Only',
        description: 'View your data in Google BigQuery',
        scope: 'https://www.googleapis.com/auth/bigquery.readonly'
      },
      {
        title: 'Cloud Platform Full Access',
        description: 'View and manage your data across Google Cloud Platform services',
        scope: 'https://www.googleapis.com/auth/cloud-platform'
      },
      {
        title: 'Cloud Platform Read Only',
        description: 'View your data across Google Cloud Platform services',
        scope: 'https://www.googleapis.com/auth/cloud-platform.read-only'
      },
      {
        title: 'Google Account Email',
        description: 'View your Google Account email address for connection identity',
        scope: 'https://www.googleapis.com/auth/userinfo.email'
      },
      {
        title: 'Google Account Profile',
        description: 'View your basic Google Account profile for connection identity',
        scope: 'https://www.googleapis.com/auth/userinfo.profile'
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
        let response = await axios.post('https://oauth2.googleapis.com/token', {
          code: ctx.code,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          redirect_uri: ctx.redirectUri,
          grant_type: 'authorization_code'
        });

        let data = response.data;
        if (typeof data.access_token !== 'string' || data.access_token.length === 0) {
          throw bigQueryServiceError(
            'Google OAuth token response did not include an access token.'
          );
        }

        return {
          output: {
            token: data.access_token,
            refreshToken:
              typeof data.refresh_token === 'string' ? data.refresh_token : undefined,
            expiresAt: expiresAtFrom(data.expires_in)
          }
        };
      } catch (error) {
        throw bigQueryOAuthError('authorization code exchange', error);
      }
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw bigQueryServiceError(
          'No refresh token is available for this BigQuery auth method.'
        );
      }

      try {
        let response = await axios.post('https://oauth2.googleapis.com/token', {
          refresh_token: ctx.output.refreshToken,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'refresh_token'
        });

        let data = response.data;
        if (typeof data.access_token !== 'string' || data.access_token.length === 0) {
          throw bigQueryServiceError(
            'Google OAuth refresh response did not include an access token.'
          );
        }

        return {
          output: {
            token: data.access_token,
            refreshToken: ctx.output.refreshToken,
            expiresAt: expiresAtFrom(data.expires_in)
          }
        };
      } catch (error) {
        throw bigQueryOAuthError('token refresh', error);
      }
    },

    getProfile: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      input: {};
      scopes: string[];
    }) => {
      try {
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
      } catch (error) {
        throw bigQueryOAuthError('profile lookup', error);
      }
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Service Account',
    key: 'service_account',

    inputSchema: z.object({
      serviceAccountJson: z.string().describe('Service account JSON key file contents')
    }),

    getOutput: async ctx => {
      try {
        let { clientEmail, privateKey } = parseServiceAccountJson(
          ctx.input.serviceAccountJson
        );

        let now = Math.floor(Date.now() / 1000);
        let header = { alg: 'RS256', typ: 'JWT' };
        let payload = {
          iss: clientEmail,
          scope:
            'https://www.googleapis.com/auth/bigquery https://www.googleapis.com/auth/cloud-platform',
          aud: 'https://oauth2.googleapis.com/token',
          iat: now,
          exp: now + 3600
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

        let pemContents = privateKey
          .replace(/-----BEGIN PRIVATE KEY-----/g, '')
          .replace(/-----END PRIVATE KEY-----/g, '')
          .replace(/\s/g, '');

        let binaryKey = atob(pemContents);
        let keyArray = new Uint8Array(binaryKey.length);
        for (let i = 0; i < binaryKey.length; i++) {
          keyArray[i] = binaryKey.charCodeAt(i);
        }

        let cryptoKey = await crypto.subtle.importKey(
          'pkcs8',
          keyArray.buffer,
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
        let encodedSignature = btoa(signatureStr)
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        let jwt = `${signingInput}.${encodedSignature}`;

        let response = await axios.post('https://oauth2.googleapis.com/token', {
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwt
        });

        let data = response.data;
        if (typeof data.access_token !== 'string' || data.access_token.length === 0) {
          throw bigQueryServiceError(
            'Google service account token response did not include an access token.'
          );
        }

        return {
          output: {
            token: data.access_token,
            expiresAt: expiresAtFrom(data.expires_in)
          }
        };
      } catch (error) {
        throw bigQueryOAuthError('service account token exchange', error);
      }
    }
  });
