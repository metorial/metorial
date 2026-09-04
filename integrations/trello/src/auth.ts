import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { trelloApiError, trelloServiceError } from './lib/errors';
import { getTrelloAccessToken, getTrelloRequestToken } from './lib/oauth1';

type TrelloAuthOutput = {
  token: string;
  apiKey: string;
};

let getTrelloProfile = async (ctx: { output: TrelloAuthOutput }) => {
  let http = createAxios({
    baseURL: 'https://api.trello.com/1'
  });

  let response: any;
  try {
    response = await http.get('/members/me', {
      params: {
        key: ctx.output.apiKey,
        token: ctx.output.token,
        fields: 'id,fullName,username,email,avatarUrl'
      }
    });
  } catch (error) {
    throw trelloApiError(error, 'get profile');
  }

  let member = response.data as {
    id: string;
    fullName?: string;
    username?: string;
    email?: string;
    avatarUrl?: string;
  };

  return {
    profile: {
      id: member.id,
      name: member.fullName || member.username,
      ...(member.email ? { email: member.email } : {}),
      imageUrl: member.avatarUrl
    }
  };
};

let requireCallbackString = (value: unknown, label: string) => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw trelloServiceError(`${label} is required to complete Trello OAuth.`);
  }

  return value;
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      apiKey: z.string()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth 1.0a',
    key: 'oauth1',

    scopes: [
      {
        title: 'Read',
        description: 'View boards, cards, members, and other Trello content',
        scope: 'read'
      },
      {
        title: 'Write',
        description: 'Create and update boards, cards, and other Trello content',
        scope: 'write'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let callbackUrl = new URL(ctx.redirectUri);
      callbackUrl.searchParams.set('state', ctx.state);
      let { oauthToken, oauthTokenSecret } = await getTrelloRequestToken(
        ctx.clientId,
        ctx.clientSecret,
        callbackUrl.toString()
      );
      let authorizationUrl = new URL('https://trello.com/1/OAuthAuthorizeToken');
      authorizationUrl.searchParams.set('oauth_token', oauthToken);
      authorizationUrl.searchParams.set('scope', ctx.scopes.join(','));
      authorizationUrl.searchParams.set('expiration', 'never');
      authorizationUrl.searchParams.set('name', 'Trello Integration');

      return {
        url: authorizationUrl.toString(),
        callbackState: {
          oauthToken,
          oauthTokenSecret
        }
      };
    },

    handleCallback: async ctx => {
      let requestToken = requireCallbackString(
        ctx.callbackState?.oauthToken,
        'Saved Trello OAuth request token'
      );
      let requestTokenSecret = requireCallbackString(
        ctx.callbackState?.oauthTokenSecret,
        'Saved Trello OAuth request token secret'
      );
      let callbackToken = requireCallbackString(
        ctx.callbackParams?.oauth_token,
        'Trello OAuth callback token'
      );
      let verifier = requireCallbackString(ctx.code, 'Trello OAuth verifier');

      if (callbackToken !== requestToken) {
        throw trelloServiceError(
          'Trello OAuth callback token did not match the saved request token.'
        );
      }

      let { oauthToken } = await getTrelloAccessToken(
        ctx.clientId,
        ctx.clientSecret,
        requestToken,
        requestTokenSecret,
        verifier
      );

      return {
        output: {
          apiKey: ctx.clientId,
          token: oauthToken
        },
        scopes: ctx.scopes
      };
    },

    getProfile: getTrelloProfile
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key & Token',
    key: 'api_key_token',

    inputSchema: z.object({
      apiKey: z.string().describe('Trello API Key from https://trello.com/apps/admin'),
      token: z.string().describe('Trello User Token generated via the authorize route')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          apiKey: ctx.input.apiKey
        }
      };
    },

    getProfile: getTrelloProfile
  });
