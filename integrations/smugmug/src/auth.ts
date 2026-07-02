import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { buildOAuth1Header, getAccessToken, getRequestToken } from './lib/oauth1';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('OAuth access token'),
      tokenSecret: z.string().describe('OAuth access token secret'),
      consumerKey: z.string().describe('OAuth consumer key (API key)'),
      consumerSecret: z.string().describe('OAuth consumer secret')
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth 1.0a',
    key: 'oauth1',

    scopes: [
      {
        title: 'Read',
        description: 'Read-only access to public and private content',
        scope: 'Read'
      },
      {
        title: 'Add',
        description:
          'Read access plus ability to create new content (upload photos, create albums)',
        scope: 'Add'
      },
      {
        title: 'Modify',
        description: 'Full access including read, create, update, and delete operations',
        scope: 'Modify'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let { oauthToken, oauthTokenSecret } = await getRequestToken(
        ctx.clientId,
        ctx.clientSecret,
        ctx.redirectUri
      );

      let permission = 'Read';
      if (ctx.scopes.includes('Modify')) {
        permission = 'Modify';
      } else if (ctx.scopes.includes('Add')) {
        permission = 'Add';
      }

      let params = new URLSearchParams({
        oauth_token: oauthToken,
        Access: 'Full',
        Permissions: permission
      });

      let url = `https://api.smugmug.com/services/oauth/authorize.mg?${params.toString()}`;

      return {
        url,
        callbackState: {
          oauthToken,
          oauthTokenSecret
        }
      };
    },

    handleCallback: async ctx => {
      let requestToken = ctx.callbackState.oauthToken as string;
      let requestTokenSecret = ctx.callbackState.oauthTokenSecret as string;
      let verifier = ctx.code;

      let { oauthToken, oauthTokenSecret } = await getAccessToken(
        ctx.clientId,
        ctx.clientSecret,
        requestToken,
        requestTokenSecret,
        verifier
      );

      return {
        output: {
          token: oauthToken,
          tokenSecret: oauthTokenSecret,
          consumerKey: ctx.clientId,
          consumerSecret: ctx.clientSecret
        }
      };
    },

    getProfile: async (ctx: {
      output: {
        token: string;
        tokenSecret: string;
        consumerKey: string;
        consumerSecret: string;
      };
      input: {};
      scopes: string[];
    }) => {
      let httpClient = createAxios({
        baseURL: 'https://api.smugmug.com'
      });

      let url = 'https://api.smugmug.com/api/v2!authuser';
      let authHeader = buildOAuth1Header('GET', url, {
        consumerKey: ctx.output.consumerKey,
        consumerSecret: ctx.output.consumerSecret,
        token: ctx.output.token,
        tokenSecret: ctx.output.tokenSecret
      });

      try {
        let response = await httpClient.get('/api/v2!authuser', {
          headers: {
            Authorization: authHeader,
            Accept: 'application/json'
          }
        });

        let user = response.data?.Response?.User;
        return {
          profile: {
            id: user?.NickName || '',
            name: user?.Name || user?.NickName || '',
            imageUrl: user?.ImageSmallUrl || undefined
          }
        };
      } catch {
        return { profile: {} };
      }
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Keys & Access Token',
    key: 'api_keys',

    inputSchema: z.object({
      consumerKey: z
        .string()
        .describe('API Key (Consumer Key) from SmugMug developer settings'),
      consumerSecret: z
        .string()
        .describe('API Secret (Consumer Secret) from SmugMug developer settings'),
      accessToken: z
        .string()
        .describe(
          'OAuth access token from SmugMug account settings (Privacy > Authorized Services)'
        ),
      accessTokenSecret: z
        .string()
        .describe('OAuth access token secret from SmugMug account settings')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.accessToken,
          tokenSecret: ctx.input.accessTokenSecret,
          consumerKey: ctx.input.consumerKey,
          consumerSecret: ctx.input.consumerSecret
        }
      };
    },

    getProfile: async (ctx: {
      output: {
        token: string;
        tokenSecret: string;
        consumerKey: string;
        consumerSecret: string;
      };
      input: {
        consumerKey: string;
        consumerSecret: string;
        accessToken: string;
        accessTokenSecret: string;
      };
    }) => {
      let httpClient = createAxios({
        baseURL: 'https://api.smugmug.com'
      });

      let url = 'https://api.smugmug.com/api/v2!authuser';
      let authHeader = buildOAuth1Header('GET', url, {
        consumerKey: ctx.output.consumerKey,
        consumerSecret: ctx.output.consumerSecret,
        token: ctx.output.token,
        tokenSecret: ctx.output.tokenSecret
      });

      try {
        let response = await httpClient.get('/api/v2!authuser', {
          headers: {
            Authorization: authHeader,
            Accept: 'application/json'
          }
        });

        let user = response.data?.Response?.User;
        return {
          profile: {
            id: user?.NickName || '',
            name: user?.Name || user?.NickName || '',
            imageUrl: user?.ImageSmallUrl || undefined
          }
        };
      } catch {
        return { profile: {} };
      }
    }
  });
