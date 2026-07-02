import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { slackOAuthError } from './lib/errors';
import {
  parseSlackGrantedScopes,
  slackBotOAuthScopes,
  slackUserOAuthScopes
} from './lib/scopes';

type SlackProfile = {
  id?: string;
  name?: string;
  teamId?: string;
  teamName?: string;
  imageUrl?: string;
};

type SlackAuthOutput = {
  token: string;
  refreshToken?: string;
  expiresAt?: string;
  actorType?: 'bot' | 'user';
  teamId?: string;
  teamName?: string;
  botUserId?: string;
  userId?: string;
};

type SlackOAuthRefreshContext = {
  output: SlackAuthOutput;
  input: {};
  clientId: string;
  clientSecret: string;
  scopes: string[];
};

type SlackOAuthResponse = {
  ok: boolean;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  team?: { id?: string; name?: string };
  bot_user_id?: string;
  authed_user?: {
    id?: string;
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };
  error?: string;
};

let createSlackApi = () => createAxios({ baseURL: 'https://slack.com/api' });

let expiresAtFromSeconds = (expiresIn?: number) =>
  typeof expiresIn === 'number' && Number.isFinite(expiresIn)
    ? new Date(Date.now() + expiresIn * 1000).toISOString()
    : undefined;

let mergeBotOAuthOutput = (
  previous: Partial<SlackAuthOutput>,
  data: SlackOAuthResponse,
  opts: { requireRotationFields?: boolean } = {}
): SlackAuthOutput => {
  if (!data.ok || !data.access_token) {
    throw slackOAuthError(data.error || 'missing bot access token');
  }

  let expiresAt = expiresAtFromSeconds(data.expires_in);
  if (opts.requireRotationFields && !expiresAt) {
    throw slackOAuthError(data.error || 'missing bot token expiration');
  }

  return {
    ...previous,
    token: data.access_token,
    refreshToken: data.refresh_token ?? previous.refreshToken,
    expiresAt,
    actorType: 'bot',
    teamId: data.team?.id ?? previous.teamId,
    teamName: data.team?.name ?? previous.teamName,
    botUserId: data.bot_user_id ?? previous.botUserId,
    userId: data.authed_user?.id ?? previous.userId
  };
};

let mergeUserOAuthOutput = (
  previous: Partial<SlackAuthOutput>,
  data: SlackOAuthResponse,
  opts: { requireRotationFields?: boolean } = {}
): SlackAuthOutput => {
  let user = data.authed_user;
  let token = user?.access_token;
  if (!data.ok || !token) {
    throw slackOAuthError(data.error || 'missing user access token');
  }

  let expiresAt = expiresAtFromSeconds(user?.expires_in);
  if (opts.requireRotationFields && !expiresAt) {
    throw slackOAuthError(data.error || 'missing user token expiration');
  }

  return {
    ...previous,
    token,
    refreshToken: user?.refresh_token ?? previous.refreshToken,
    expiresAt,
    actorType: 'user',
    teamId: data.team?.id ?? previous.teamId,
    teamName: data.team?.name ?? previous.teamName,
    botUserId: previous.botUserId,
    userId: user?.id ?? previous.userId
  };
};

let getSlackProfile = async (token: string): Promise<SlackProfile> => {
  let client = createSlackApi();

  let response = await client.get('/auth.test', {
    headers: { Authorization: `Bearer ${token}` }
  });

  let data = response.data as {
    ok: boolean;
    user_id?: string;
    user?: string;
    team_id?: string;
    team?: string;
    url?: string;
  };

  let profile: SlackProfile = {
    id: data.user_id,
    name: data.user,
    teamId: data.team_id,
    teamName: data.team
  };

  try {
    let teamResponse = await client.get('/team.info', {
      headers: { Authorization: `Bearer ${token}` }
    });

    let teamData = teamResponse.data as {
      ok: boolean;
      team?: { icon?: { image_132?: string } };
    };

    if (teamData.ok && teamData.team?.icon?.image_132) {
      profile.imageUrl = teamData.team.icon.image_132;
    }
  } catch {
    // Team icons are nice-to-have profile metadata.
  }

  return profile;
};

let getAuthorizationUrl =
  (scopeParam: 'scope' | 'user_scope') =>
  async (ctx: { clientId: string; scopes: string[]; redirectUri: string; state: string }) => {
    let params = new URLSearchParams({
      client_id: ctx.clientId,
      [scopeParam]: ctx.scopes.join(','),
      redirect_uri: ctx.redirectUri,
      state: ctx.state
    });

    return {
      url: `https://slack.com/oauth/v2/authorize?${params.toString()}`
    };
  };

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      actorType: z.enum(['bot', 'user']).optional(),
      teamId: z.string().optional(),
      teamName: z.string().optional(),
      botUserId: z.string().optional(),
      userId: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'Slack OAuth (Bot)',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://docs.slack.dev/tools/node-slack-sdk/oauth/'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://docs.slack.dev/reference/scopes/'
      }
    ],
    scopes: slackBotOAuthScopes,
    getAuthorizationUrl: getAuthorizationUrl('scope'),

    handleCallback: async ctx => {
      let client = createSlackApi();

      let response = await client.post('/oauth.v2.access', null, {
        params: {
          code: ctx.code,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          redirect_uri: ctx.redirectUri
        }
      });

      let data = response.data as SlackOAuthResponse;
      let scopes = parseSlackGrantedScopes(data.scope);

      return {
        output: mergeBotOAuthOutput({}, data),
        scopes: scopes.length > 0 ? scopes : undefined
      };
    },

    handleTokenRefresh: async (ctx: SlackOAuthRefreshContext) => {
      if (!ctx.output.refreshToken) {
        return { output: ctx.output };
      }

      let client = createSlackApi();

      let response = await client.post('/oauth.v2.access', null, {
        params: {
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken
        }
      });

      return {
        output: mergeBotOAuthOutput(ctx.output, response.data as SlackOAuthResponse, {
          requireRotationFields: true
        })
      };
    },

    getProfile: async (ctx: { output: { token: string } }) => ({
      profile: await getSlackProfile(ctx.output.token)
    })
  })
  .addOauth({
    type: 'auth.oauth',
    name: 'Slack OAuth (User)',
    key: 'user_oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://docs.slack.dev/tools/node-slack-sdk/oauth/'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://docs.slack.dev/reference/scopes/'
      }
    ],
    scopes: slackUserOAuthScopes,
    getAuthorizationUrl: getAuthorizationUrl('user_scope'),

    handleCallback: async ctx => {
      let client = createSlackApi();

      let response = await client.post('/oauth.v2.access', null, {
        params: {
          code: ctx.code,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          redirect_uri: ctx.redirectUri
        }
      });

      let data = response.data as SlackOAuthResponse;
      let scopes = parseSlackGrantedScopes(data.authed_user?.scope);

      return {
        output: mergeUserOAuthOutput({}, data),
        scopes: scopes.length > 0 ? scopes : undefined
      };
    },

    handleTokenRefresh: async (ctx: SlackOAuthRefreshContext) => {
      if (!ctx.output.refreshToken) {
        return { output: ctx.output };
      }

      let client = createSlackApi();

      let response = await client.post('/oauth.v2.access', null, {
        params: {
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken
        }
      });

      return {
        output: mergeUserOAuthOutput(ctx.output, response.data as SlackOAuthResponse, {
          requireRotationFields: true
        })
      };
    },

    getProfile: async (ctx: { output: { token: string } }) => ({
      profile: await getSlackProfile(ctx.output.token)
    })
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Bot Token',
    key: 'bot_token',

    inputSchema: z.object({
      token: z.string().describe('Slack Bot Token (starts with xoxb-)')
    }),

    getOutput: async ctx => ({
      output: {
        token: ctx.input.token,
        actorType: 'bot' as const
      }
    }),

    getProfile: async (ctx: { output: { token: string } }) => ({
      profile: await getSlackProfile(ctx.output.token)
    })
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'User Token',
    key: 'user_token',

    inputSchema: z.object({
      token: z.string().describe('Slack User Token (starts with xoxp-)')
    }),

    getOutput: async ctx => ({
      output: {
        token: ctx.input.token,
        actorType: 'user' as const
      }
    }),

    getProfile: async (ctx: { output: { token: string } }) => ({
      profile: await getSlackProfile(ctx.output.token)
    })
  });
