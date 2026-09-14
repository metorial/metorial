import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { googleAdsScopes } from './scopes';

let googleOAuthAxios = createAxios({
  baseURL: 'https://oauth2.googleapis.com'
});

let profileAxios = createAxios({
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
        title: 'Google Ads',
        description:
          'Full access to manage Google Ads accounts, campaigns, ads, and reporting',
        scope: googleAdsScopes.adwords
      },
      {
        title: 'User Email',
        description: 'View the email address of the authenticated user',
        scope: googleAdsScopes.userInfoEmail
      },
      {
        title: 'User Profile',
        description: 'View basic profile information of the authenticated user',
        scope: googleAdsScopes.userInfoProfile
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        scope: ctx.scopes.join(' '),
        access_type: 'offline',
        prompt: 'consent',
        state: ctx.state
      });

      return {
        url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response = await googleOAuthAxios.post(
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

      let response = await googleOAuthAxios.post(
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

    getProfile: async (ctx: {
      output: {
        token: string;
        refreshToken?: string;
        expiresAt?: string;
      };
      scopes: string[];
    }) => {
      let response = await profileAxios.get('/oauth2/v2/userinfo', {
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
