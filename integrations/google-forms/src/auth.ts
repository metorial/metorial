import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { googleFormsScopes } from './scopes';

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
        title: 'Forms (Full)',
        description: 'See, edit, create, and delete all your Google Forms forms',
        scope: googleFormsScopes.formsBody
      },
      {
        title: 'Forms (Read-only)',
        description: 'See all your Google Forms forms',
        scope: googleFormsScopes.formsBodyReadonly
      },
      {
        title: 'Responses (Read-only)',
        description: 'See all responses to your Google Forms forms',
        scope: googleFormsScopes.formsResponsesReadonly
      },
      {
        title: 'Drive (App files)',
        description:
          'See, edit, create, and delete only the specific Google Drive files you use with this app',
        scope: googleFormsScopes.driveFile
      },
      {
        title: 'User Profile',
        description: 'View your basic profile info (email, name, photo)',
        scope: googleFormsScopes.userInfoProfile
      },
      {
        title: 'User Email',
        description: 'View your email address',
        scope: googleFormsScopes.userInfoEmail
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
      let client = createAxios();

      let response = await client.post(
        'https://oauth2.googleapis.com/token',
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

      let data = response.data as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
        token_type?: string;
        scope?: string;
      };

      if (!data.access_token) {
        throw new Error('Failed to obtain access token from Google');
      }

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
        throw new Error('No refresh token available');
      }

      let client = createAxios();

      let response = await client.post(
        'https://oauth2.googleapis.com/token',
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

      let data = response.data as {
        access_token: string;
        expires_in?: number;
        token_type?: string;
      };

      if (!data.access_token) {
        throw new Error('Failed to refresh access token');
      }

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

    getProfile: async (ctx: { output: { token: string }; input: {}; scopes: string[] }) => {
      let client = createAxios();

      let response = await client.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${ctx.output.token}` }
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
  });
