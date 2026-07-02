import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

type GoogleOauthInput = Record<string, never>;

type GoogleOauthOutput = {
  token: string;
  refreshToken?: string;
  expiresAt?: string;
};

type GoogleOauthRefreshContext = {
  output: GoogleOauthOutput;
  input: GoogleOauthInput;
  clientId: string;
  clientSecret: string;
  scopes: string[];
};

let axios = createAxios({
  baseURL: 'https://oauth2.googleapis.com'
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
    name: 'Google OAuth2',
    key: 'google_oauth2',

    scopes: [
      {
        title: 'Google Sheets - Full Access',
        description: 'Full read and write access to Google Sheets',
        scope: 'https://www.googleapis.com/auth/spreadsheets'
      },
      {
        title: 'Google Drive - File Access',
        description: 'Access to files created or opened by the app',
        scope: 'https://www.googleapis.com/auth/drive.file'
      }
    ],

    inputSchema: z.object({}),

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
        url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
        input: ctx.input
      };
    },

    handleCallback: async ctx => {
      let response = await axios.post(
        '/token',
        new URLSearchParams({
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          code: ctx.code,
          grant_type: 'authorization_code',
          redirect_uri: ctx.redirectUri
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      let data = response.data as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
      };

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: data.expires_in
            ? new Date(Date.now() + data.expires_in * 1000).toISOString()
            : undefined
        },
        input: ctx.input
      };
    },

    handleTokenRefresh: async (ctx: GoogleOauthRefreshContext) => {
      if (!ctx.output.refreshToken) {
        throw new Error('No refresh token available');
      }

      let response = await axios.post(
        '/token',
        new URLSearchParams({
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          refresh_token: ctx.output.refreshToken,
          grant_type: 'refresh_token'
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      let data = response.data as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
      };

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt: data.expires_in
            ? new Date(Date.now() + data.expires_in * 1000).toISOString()
            : undefined
        },
        input: ctx.input
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: Record<string, never> }) => {
      let profileAxios = createAxios({
        baseURL: 'https://www.googleapis.com'
      });

      let response = await profileAxios.get('/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let data = response.data as {
        id?: string;
        email?: string;
        name?: string;
        picture?: string;
      };

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
  .addServiceAccountAuth({
    type: 'auth.service_account',
    name: 'Service Account',
    key: 'service_account',

    inputSchema: z.object({
      serviceAccountJson: z.string().describe('JSON key file contents for the service account')
    }),

    getOutput: async ctx => {
      let serviceAccount: {
        client_email: string;
        private_key: string;
        token_uri?: string;
      };

      try {
        serviceAccount = JSON.parse(ctx.input.serviceAccountJson);
      } catch {
        throw new Error('Invalid service account JSON');
      }

      if (!serviceAccount.client_email || !serviceAccount.private_key) {
        throw new Error('Service account JSON must contain client_email and private_key');
      }

      let token = await generateServiceAccountToken(serviceAccount, [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file'
      ]);

      return {
        output: {
          token: token.accessToken,
          expiresAt: token.expiresAt
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string };
      input: { serviceAccountJson: string };
    }) => {
      let serviceAccount: { client_email: string };

      try {
        serviceAccount = JSON.parse(ctx.input.serviceAccountJson);
      } catch {
        throw new Error('Invalid service account JSON');
      }

      return {
        profile: {
          email: serviceAccount.client_email,
          name: 'Service Account'
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      token: z
        .string()
        .describe('Google Cloud API Key (read-only access to public spreadsheets only)')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  });

let generateServiceAccountToken = async (
  serviceAccount: {
    client_email: string;
    private_key: string;
    token_uri?: string;
  },
  scopes: string[]
): Promise<{ accessToken: string; expiresAt: string }> => {
  let now = Math.floor(Date.now() / 1000);
  let exp = now + 3600;

  let header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  let payload = {
    iss: serviceAccount.client_email,
    scope: scopes.join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: exp
  };

  let jwt = await signJwt(header, payload, serviceAccount.private_key);

  let response = await axios.post(
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

  let data = response.data as {
    access_token: string;
    expires_in: number;
  };

  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString()
  };
};

let signJwt = async (header: object, payload: object, privateKey: string): Promise<string> => {
  let base64UrlEncode = (data: Uint8Array): string => {
    let base64 = btoa(String.fromCharCode(...data));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };

  let textEncoder = new TextEncoder();
  let headerB64 = base64UrlEncode(textEncoder.encode(JSON.stringify(header)));
  let payloadB64 = base64UrlEncode(textEncoder.encode(JSON.stringify(payload)));
  let signingInput = `${headerB64}.${payloadB64}`;

  let pemContents = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');
  let binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  let cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  let signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    textEncoder.encode(signingInput)
  );

  let signatureB64 = base64UrlEncode(new Uint8Array(signature));

  return `${signingInput}.${signatureB64}`;
};
