import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { mondayApiError, mondayGraphQLError } from './lib/errors';

let mondayApi = createAxios({
  baseURL: 'https://api.monday.com/v2'
});

let mondayAuth = createAxios({
  baseURL: 'https://auth.monday.com'
});

let getProfile = async (token: string) => {
  let response: any;
  try {
    response = await mondayApi.post(
      '',
      {
        query: `{ me { id name email photo_original } }`
      },
      {
        headers: {
          Authorization: token,
          'Content-Type': 'application/json',
          'API-Version': '2026-04'
        }
      }
    );
  } catch (error) {
    throw mondayApiError(error, 'get profile');
  }

  if (response.data.errors?.length) {
    throw mondayGraphQLError(response.data.errors, 'get profile');
  }

  let me = response.data.data.me;

  return {
    profile: {
      id: String(me.id),
      name: me.name,
      email: me.email,
      imageUrl: me.photo_original
    }
  };
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',

    scopes: [
      {
        title: 'Account Read',
        description: 'Read general information about the account',
        scope: 'account:read'
      },
      {
        title: 'Assets Read',
        description: 'Read data from assets the user has access to',
        scope: 'assets:read'
      },
      { title: 'Boards Read', description: "Read a user's board data", scope: 'boards:read' },
      {
        title: 'Boards Write',
        description: "Modify a user's board data",
        scope: 'boards:write'
      },
      { title: 'Docs Read', description: "Read a user's docs", scope: 'docs:read' },
      { title: 'Docs Write', description: "Modify a user's docs", scope: 'docs:write' },
      { title: 'Me Read', description: "Read a user's profile information", scope: 'me:read' },
      {
        title: 'Notifications Write',
        description: 'Send notifications on behalf of the user',
        scope: 'notifications:write'
      },
      { title: 'Tags Read', description: "Read the account's tags", scope: 'tags:read' },
      {
        title: 'Teams Read',
        description: "Read information about the account's teams",
        scope: 'teams:read'
      },
      {
        title: 'Teams Write',
        description: "Modify the account's teams",
        scope: 'teams:write'
      },
      {
        title: 'Updates Read',
        description: 'Read updates and replies the user can see',
        scope: 'updates:read'
      },
      {
        title: 'Updates Write',
        description: 'Post or edit updates on behalf of the user',
        scope: 'updates:write'
      },
      {
        title: 'Users Read',
        description: "Read profile information of the account's users",
        scope: 'users:read'
      },
      {
        title: 'Users Write',
        description: "Modify profile information of the account's users",
        scope: 'users:write'
      },
      {
        title: 'Webhooks Read',
        description: 'Read existing webhooks configuration',
        scope: 'webhooks:read'
      },
      {
        title: 'Webhooks Write',
        description: 'Create and modify webhooks',
        scope: 'webhooks:write'
      },
      {
        title: 'Workspaces Read',
        description: "Read a user's workspaces data",
        scope: 'workspaces:read'
      },
      {
        title: 'Workspaces Write',
        description: "Modify a user's workspaces data",
        scope: 'workspaces:write'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });

      if (ctx.scopes.length > 0) {
        params.set('scopes', ctx.scopes.join(' '));
      }

      return {
        url: `https://auth.monday.com/oauth2/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response: any;
      try {
        response = await mondayAuth.post('/oauth2/token', {
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          code: ctx.code,
          redirect_uri: ctx.redirectUri
        });
      } catch (error) {
        throw mondayApiError(error, 'oauth callback');
      }

      return {
        output: {
          token: response.data.access_token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: any; scopes: string[] }) => {
      return getProfile(ctx.output.token);
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',

    inputSchema: z.object({
      apiToken: z.string()
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiToken
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { apiToken: string } }) => {
      return getProfile(ctx.output.token);
    }
  });
