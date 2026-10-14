import { createApiServiceError, isApiErrorRecord, SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';
import { createEversignAxios } from './lib/errors';

let getBusinessProfile = async (token: string, isOauth: boolean) => {
  let businesses = await new Client({ token, isOauth }).listBusinesses();
  if (!Array.isArray(businesses)) {
    throw createApiServiceError('Eversign returned an invalid business list.');
  }
  let primary =
    businesses.find(b => b.is_primary === 1 || b.is_primary === '1') ?? businesses[0];
  return {
    profile: {
      id: primary ? String(primary.business_id) : undefined,
      name: primary?.business_name
    }
  };
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      authType: z.enum(['api_key', 'oauth']).optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Access Key',
    key: 'api_access_key',
    inputSchema: z.object({
      apiAccessKey: z
        .string()
        .describe(
          'Your Eversign API Access Key. Found in the Developer section of your account settings.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiAccessKey,
          authType: 'api_key' as const
        }
      };
    },
    getProfile: async (ctx: {
      output: { token: string };
      input: { apiAccessKey: string };
    }) => {
      return getBusinessProfile(ctx.output.token, false);
    }
  })
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',
    scopes: [
      {
        title: 'Full Access',
        description:
          'Full access to create, manage, and sign documents on behalf of the user.',
        scope: 'full_access'
      }
    ],
    getAuthorizationUrl: async ctx => {
      let url = `https://app.eversign.com/oauth/authorize?client_id=${encodeURIComponent(ctx.clientId)}&state=${encodeURIComponent(ctx.state)}`;
      return { url };
    },
    handleCallback: async ctx => {
      let axios = createEversignAxios({
        baseURL: 'https://app.eversign.com',
        contentType: false
      });

      let formData = new FormData();
      formData.append('client_id', ctx.clientId);
      formData.append('client_secret', ctx.clientSecret);
      formData.append('code', ctx.code);
      formData.append('state', ctx.state);

      let response = await axios.post('/oauth/token', formData);

      let data: unknown = response.data;
      if (
        !isApiErrorRecord(data) ||
        typeof data.access_token !== 'string' ||
        !data.access_token
      ) {
        throw createApiServiceError(
          'Eversign did not return an OAuth access token. Reconnect the account.'
        );
      }
      if (typeof data.state === 'string' && data.state !== ctx.state) {
        throw createApiServiceError(
          'Eversign returned an OAuth state mismatch. Reconnect the account.'
        );
      }

      return {
        output: {
          token: data.access_token,
          authType: 'oauth' as const
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: {}; scopes: string[] }) => {
      return getBusinessProfile(ctx.output.token, true);
    }
  });
