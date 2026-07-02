import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let canvaApi = createAxios({
  baseURL: 'https://api.canva.com/rest/v1'
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
        url: 'https://www.canva.dev/docs/connect/authentication/'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://www.canva.dev/docs/connect/appendix/scopes/'
      }
    ],

    scopes: [
      {
        title: 'Read Assets',
        description: "View metadata for the user's assets",
        scope: 'asset:read'
      },
      {
        title: 'Write Assets',
        description: 'Upload, update, or delete assets',
        scope: 'asset:write'
      },
      {
        title: 'Read Brand Template Content',
        description: 'Read brand template content',
        scope: 'brandtemplate:content:read'
      },
      {
        title: 'Read Brand Template Metadata',
        description: 'View brand template metadata',
        scope: 'brandtemplate:meta:read'
      },
      {
        title: 'Collaboration Events',
        description: 'Receive webhook notifications for collaboration events',
        scope: 'collaboration:event'
      },
      {
        title: 'Read Comments',
        description: 'View comments on designs',
        scope: 'comment:read'
      },
      {
        title: 'Write Comments',
        description: 'Create comments and replies on designs',
        scope: 'comment:write'
      },
      {
        title: 'Read Design Content',
        description: 'View contents of designs',
        scope: 'design:content:read'
      },
      {
        title: 'Write Design Content',
        description: 'Create designs',
        scope: 'design:content:write'
      },
      {
        title: 'Read Design Metadata',
        description: 'View design metadata',
        scope: 'design:meta:read'
      },
      {
        title: 'Manage Folder Permissions',
        description: 'Manage folder permissions',
        scope: 'folder:permission:write'
      },
      {
        title: 'Read Folders',
        description: 'View folder metadata and contents',
        scope: 'folder:read'
      },
      {
        title: 'Write Folders',
        description: 'Add, move, or remove folders',
        scope: 'folder:write'
      },
      {
        title: 'Read Profile',
        description: 'Read user profile information',
        scope: 'profile:read'
      },
      {
        title: 'OpenID',
        description: 'Read user info through OIDC',
        scope: 'openid'
      },
      {
        title: 'Profile (OIDC)',
        description: 'Read user profile through OIDC',
        scope: 'profile'
      },
      {
        title: 'Email (OIDC)',
        description: 'Read user email through OIDC',
        scope: 'email'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let codeVerifier = generateCodeVerifier();
      let codeChallenge = await generateCodeChallenge(codeVerifier);

      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        scope: ctx.scopes.join(' '),
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        state: ctx.state
      });

      return {
        url: `https://www.canva.com/api/oauth/authorize?${params.toString()}`,
        input: { codeVerifier }
      };
    },

    inputSchema: z.object({
      codeVerifier: z.string().optional()
    }),

    handleCallback: async ctx => {
      let credentials = btoa(`${ctx.clientId}:${ctx.clientSecret}`);

      let response = await canvaApi.post(
        '/oauth/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri,
          code_verifier: ctx.input.codeVerifier || ''
        }).toString(),
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      let data = response.data as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
        token_type: string;
      };

      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw new Error('No refresh token available');
      }

      let credentials = btoa(`${ctx.clientId}:${ctx.clientSecret}`);

      let response = await canvaApi.post(
        '/oauth/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken
        }).toString(),
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      let data = response.data as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
        token_type: string;
      };

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

    getProfile: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      input: { codeVerifier?: string };
      scopes: string[];
    }) => {
      let [meResponse, profileResponse] = await Promise.all([
        canvaApi.get('/users/me', {
          headers: { Authorization: `Bearer ${ctx.output.token}` }
        }),
        canvaApi
          .get('/users/me/profile', {
            headers: { Authorization: `Bearer ${ctx.output.token}` }
          })
          .catch(() => null)
      ]);

      let meData = meResponse.data as {
        team_user: { user_id: string; team_id: string };
      };

      let profileData = profileResponse?.data as {
        profile?: { display_name?: string };
      } | null;

      return {
        profile: {
          id: meData.team_user.user_id,
          name: profileData?.profile?.display_name,
          teamId: meData.team_user.team_id
        }
      };
    }
  });

let generateCodeVerifier = (): string => {
  let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  let randomValues = new Uint8Array(64);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < 64; i++) {
    result += chars[randomValues[i]! % chars.length];
  }
  return result;
};

let generateCodeChallenge = async (verifier: string): Promise<string> => {
  let encoder = new TextEncoder();
  let data = encoder.encode(verifier);
  let digest = await crypto.subtle.digest('SHA-256', data);
  let bytes = new Uint8Array(digest);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
