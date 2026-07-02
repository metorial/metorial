import { createApiServiceError, createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { workableApiError } from './lib/errors';

let tokenUrl = 'https://www.workable.com/oauth/token';

let createTokenBody = (values: Record<string, string | undefined>) => {
  let body = new URLSearchParams();

  for (let [key, value] of Object.entries(values)) {
    if (value !== undefined) body.set(key, value);
  }

  return body;
};

let expiresAtFromSeconds = (seconds: unknown) =>
  new Date(Date.now() + (typeof seconds === 'number' ? seconds : 7200) * 1000).toISOString();

let getProfileFromToken = async (token: string) => {
  let axios = createAxios({
    baseURL: 'https://www.workable.com/spi/v3',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  try {
    let response = await axios.get('/accounts');
    let accounts = response.data.accounts;
    let account = accounts?.[0];

    return {
      profile: {
        id: account?.subdomain,
        name: account?.name || account?.subdomain
      }
    };
  } catch (error) {
    throw workableApiError(error, 'get auth profile');
  }
};

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
    name: 'OAuth 2.0',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://workable.readme.io/page/oauth'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://workable.readme.io/reference'
      }
    ],

    scopes: [
      {
        title: 'Read Account',
        description: 'Read account metadata, departments, members, and lookup data',
        scope: 'r_account'
      },
      {
        title: 'Read Jobs',
        description: 'Read jobs, stages, events, questions, and application forms',
        scope: 'r_jobs'
      },
      {
        title: 'Read Candidates',
        description: 'Read candidates, candidate activity, files, and offers',
        scope: 'r_candidates'
      },
      {
        title: 'Write Candidates',
        description: 'Create, update, move, tag, rate, comment on, and disqualify candidates',
        scope: 'w_candidates'
      },
      {
        title: 'Read Employees',
        description: 'Read Workable HR employee records and employee lookups',
        scope: 'r_employees'
      },
      {
        title: 'Write Employees',
        description: 'Create and update Workable HR employee records',
        scope: 'w_employees'
      },
      {
        title: 'Read Requisitions',
        description: 'Read Hiring Plan requisitions',
        scope: 'r_requisitions'
      },
      {
        title: 'Write Requisitions',
        description: 'Create, update, approve, and reject Hiring Plan requisitions',
        scope: 'w_requisitions'
      },
      {
        title: 'Read Time Off',
        description: 'Read time-off categories, requests, balances, and approvals',
        scope: 'r_timeoff'
      },
      {
        title: 'Write Time Off',
        description: 'Create time-off requests and update time-off approvals',
        scope: 'w_timeoff'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let search = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        resource: 'user',
        response_type: 'code',
        scope: ctx.scopes.join(' ')
      });

      return { url: `https://www.workable.com/oauth/authorize?${search.toString()}` };
    },

    handleCallback: async ctx => {
      let axios = createAxios({
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      try {
        let response = await axios.post(
          tokenUrl,
          createTokenBody({
            client_id: ctx.clientId,
            client_secret: ctx.clientSecret,
            code: ctx.code,
            redirect_uri: ctx.redirectUri,
            grant_type: 'authorization_code'
          })
        );

        let data = response.data;

        return {
          output: {
            token: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: expiresAtFromSeconds(data.expires_in)
          }
        };
      } catch (error) {
        throw workableApiError(error, 'exchange OAuth code');
      }
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw createApiServiceError('No Workable refresh token is available.');
      }

      let axios = createAxios({
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      try {
        let response = await axios.post(
          tokenUrl,
          createTokenBody({
            client_id: ctx.clientId,
            client_secret: ctx.clientSecret,
            refresh_token: ctx.output.refreshToken,
            grant_type: 'refresh_token'
          })
        );

        let data = response.data;

        return {
          output: {
            token: data.access_token,
            refreshToken: data.refresh_token || ctx.output.refreshToken,
            expiresAt: expiresAtFromSeconds(data.expires_in)
          }
        };
      } catch (error) {
        throw workableApiError(error, 'refresh OAuth token');
      }
    },

    getProfile: async (ctx: { output: { token: string }; input: {}; scopes: string[] }) =>
      await getProfileFromToken(ctx.output.token)
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Access Token',
    key: 'api_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe('Workable API access token (generated from Settings > Integrations > Apps)')
    }),

    getOutput: async ctx => ({
      output: {
        token: ctx.input.token
      }
    }),

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) =>
      await getProfileFromToken(ctx.output.token)
  });
