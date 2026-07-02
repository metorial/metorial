import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      subscriptionKey: z.string()
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
        url: 'https://developer.blackbaud.com/skyapi/docs/authorization/auth-code-flow'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developer.blackbaud.com/skyapi/docs/applications/scopes'
      }
    ],

    scopes: [
      {
        title: 'Full Access',
        description:
          'Full data access across all Blackbaud solutions, including future solutions.',
        scope: 'full'
      }
    ],

    inputSchema: z.object({
      subscriptionKey: z
        .string()
        .describe(
          'Your Blackbaud SKY API subscription key (Bb-Api-Subscription-Key). Found in the developer portal under your subscription.'
        )
    }),

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        response_type: 'code',
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });

      return {
        url: `https://oauth2.sky.blackbaud.com/authorization?${params.toString()}`,
        input: ctx.input
      };
    },

    handleCallback: async ctx => {
      let http = createAxios({});

      let response = await http.post(
        'https://oauth2.sky.blackbaud.com/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
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
          refreshToken: data.refresh_token,
          expiresAt,
          subscriptionKey: ctx.input.subscriptionKey
        },
        input: ctx.input
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw new Error('No refresh token available');
      }

      let http = createAxios({});

      let response = await http.post(
        'https://oauth2.sky.blackbaud.com/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
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
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt,
          subscriptionKey: ctx.output.subscriptionKey
        },
        input: ctx.input
      };
    }
  });
