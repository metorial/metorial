import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

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
    name: 'OAuth 2.0 (PKCE)',
    key: 'oauth_pkce',

    scopes: [
      {
        title: 'Contact Data',
        description: 'Access to search and enrich contact records',
        scope: 'api:data:contact'
      },
      {
        title: 'Company Data',
        description: 'Access to search and enrich company records',
        scope: 'api:data:company'
      },
      {
        title: 'User Data',
        description: 'Access to user usage and account information',
        scope: 'api:data:user'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let codeVerifier = generateCodeVerifier();
      let codeChallenge = await generateCodeChallenge(codeVerifier);

      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256'
      });

      if (ctx.scopes.length > 0) {
        params.set('scope', ctx.scopes.join(' '));
      }

      let url = `https://login.zoominfo.com/oauth/authorize?${params.toString()}`;

      return {
        url,
        callbackState: { codeVerifier }
      };
    },

    handleCallback: async ctx => {
      let http = createAxios();

      let basicAuth = btoa(`${ctx.clientId}:${ctx.clientSecret}`);

      let body = new URLSearchParams({
        grant_type: 'authorization_code',
        code: ctx.code,
        redirect_uri: ctx.redirectUri,
        code_verifier: ctx.callbackState.codeVerifier
      });

      let response = await http.post(
        'https://okta-login.zoominfo.com/oauth2/default/v1/token',
        body.toString(),
        {
          headers: {
            Authorization: `Basic ${basicAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      let data = response.data;
      let expiresAt = new Date(Date.now() + (data.expires_in || 86400) * 1000).toISOString();

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      let http = createAxios();
      let basicAuth = btoa(`${ctx.clientId}:${ctx.clientSecret}`);

      let body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: ctx.output.refreshToken || ''
      });

      let response = await http.post(
        'https://okta-login.zoominfo.com/oauth2/default/v1/token',
        body.toString(),
        {
          headers: {
            Authorization: `Basic ${basicAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      let data = response.data;
      let expiresAt = new Date(Date.now() + (data.expires_in || 86400) * 1000).toISOString();

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Username & Password (Legacy)',
    key: 'legacy_password',

    inputSchema: z.object({
      username: z.string().describe('ZoomInfo account username/email'),
      password: z.string().describe('ZoomInfo account password')
    }),

    getOutput: async ctx => {
      let http = createAxios({ baseURL: 'https://api.zoominfo.com' });

      let response = await http.post('/authenticate', {
        username: ctx.input.username,
        password: ctx.input.password
      });

      let jwt = response.data.jwt;
      let expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      return {
        output: {
          token: jwt,
          expiresAt
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'PKI Authentication (Legacy)',
    key: 'legacy_pki',

    inputSchema: z.object({
      clientId: z
        .string()
        .describe(
          'Client ID from ZoomInfo Admin Portal (Admin Portal > Integrations > API & Webhooks)'
        ),
      privateKey: z.string().describe('Private Key from ZoomInfo Admin Portal')
    }),

    getOutput: async ctx => {
      let http = createAxios({ baseURL: 'https://api.zoominfo.com' });

      let response = await http.post('/authenticate', {
        clientId: ctx.input.clientId,
        privateKey: ctx.input.privateKey
      });

      let jwt = response.data.jwt;
      let expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      return {
        output: {
          token: jwt,
          expiresAt
        }
      };
    }
  });

let generateCodeVerifier = (): string => {
  let array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
};

let generateCodeChallenge = async (verifier: string): Promise<string> => {
  let encoder = new TextEncoder();
  let data = encoder.encode(verifier);
  let digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
};

let base64UrlEncode = (buffer: Uint8Array): string => {
  let str = '';
  for (let i = 0; i < buffer.length; i++) {
    str += String.fromCharCode(buffer[i]!);
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
