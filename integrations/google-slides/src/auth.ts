import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { googleSlidesScopes } from './scopes';

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
        title: 'Presentations',
        description: 'See, edit, create, and delete all Google Slides presentations.',
        scope: googleSlidesScopes.presentations
      },
      {
        title: 'Presentations (Read-only)',
        description: 'See all Google Slides presentations.',
        scope: googleSlidesScopes.presentationsReadonly
      },
      {
        title: 'Drive File',
        description:
          'See, edit, create, and delete only the specific Google Drive files used with the app. (Recommended)',
        scope: googleSlidesScopes.driveFile
      },
      {
        title: 'Spreadsheets (Read-only)',
        description:
          'See all Google Sheets spreadsheets. Required for refreshing linked charts.',
        scope: googleSlidesScopes.spreadsheetsReadonly
      },
      {
        title: 'Spreadsheets',
        description: 'See, edit, create, and delete all Google Sheets spreadsheets.',
        scope: googleSlidesScopes.spreadsheets
      },
      {
        title: 'User Profile',
        description:
          "See your personal info, including any personal info you've made publicly available.",
        scope: googleSlidesScopes.userInfoProfile
      },
      {
        title: 'User Email',
        description: 'See your primary Google Account email address.',
        scope: googleSlidesScopes.userInfoEmail
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
      let http = createAxios();

      let response = await http.post(
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

      let expiresAt: string | undefined;
      if (data.expires_in) {
        expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
      }
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
        return { output: ctx.output };
      }

      let http = createAxios();

      let response = await http.post(
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

      let expiresAt: string | undefined;
      if (data.expires_in) {
        expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
      }

      return {
        output: {
          token: data.access_token,
          refreshToken: ctx.output.refreshToken,
          expiresAt
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      input: {};
      scopes: string[];
    }) => {
      let http = createAxios({
        baseURL: 'https://www.googleapis.com'
      });

      let response = await http.get('/oauth2/v2/userinfo', {
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
  });
