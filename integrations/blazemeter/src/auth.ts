import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { BlazeMeterClient } from './lib/client';
import { RunscopeClient } from './lib/runscope-client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      apiKeyId: z.string().optional(),
      apiKeySecret: z.string().optional(),
      runscopeToken: z.string().optional()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key (Basic Auth)',
    key: 'api_key',

    inputSchema: z.object({
      apiKeyId: z.string().describe('BlazeMeter API Key ID'),
      apiKeySecret: z.string().describe('BlazeMeter API Key Secret')
    }),

    getOutput: async ctx => {
      if (!ctx.input.apiKeyId.trim() || !ctx.input.apiKeySecret.trim()) {
        throw createApiServiceError('BlazeMeter API Key ID and Secret are required.');
      }
      let token = Buffer.from(`${ctx.input.apiKeyId}:${ctx.input.apiKeySecret}`).toString(
        'base64'
      );
      return {
        output: {
          token,
          apiKeyId: ctx.input.apiKeyId,
          apiKeySecret: ctx.input.apiKeySecret
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string };
      input: { apiKeyId: string; apiKeySecret: string };
    }) => {
      let data = await new BlazeMeterClient({ token: ctx.output.token }).getCurrentUser();
      if (data?.id === undefined || data?.id === null) {
        throw createApiServiceError('BlazeMeter did not return an authenticated user ID.');
      }

      return {
        profile: {
          id: String(data.id),
          email: data.email ?? undefined,
          name:
            data.displayName ??
            ([data.firstName, data.lastName].filter(Boolean).join(' ') || undefined)
        }
      };
    }
  })
  .addOauth({
    type: 'auth.oauth',
    name: 'API Monitoring (OAuth)',
    key: 'runscope_oauth',

    scopes: [
      {
        title: 'Read Access',
        description:
          'Read access to account information including message streams and buckets',
        scope: 'api:read'
      },
      {
        title: 'Create Buckets',
        description: 'Create API monitoring buckets',
        scope: 'message:write'
      },
      {
        title: 'Bucket Access',
        description: 'Access authenticated monitoring buckets',
        scope: 'bucket:write'
      },
      {
        title: 'Read Tests',
        description: 'Read API monitoring tests and results',
        scope: 'test:read'
      },
      {
        title: 'Manage Tests',
        description: 'Create, update, delete, and run API monitoring tests',
        scope: 'test:write'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        scope: ctx.scopes.join(' '),
        state: ctx.state
      });

      return {
        url: `https://www.runscope.com/signin/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let client = createAuthenticatedAxios({
        baseURL: 'https://www.runscope.com',
        contentType: 'application/x-www-form-urlencoded',
        errorAdapter: error =>
          buildApiServiceError(error, {
            providerLabel: 'BlazeMeter API Monitoring OAuth',
            reason: 'blazemeter_oauth_error'
          })
      });

      let response = await client.post(
        '/signin/oauth/access_token',
        new URLSearchParams({
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          code: ctx.code,
          grant_type: 'authorization_code',
          redirect_uri: ctx.redirectUri
        }).toString()
      );

      let data = response.data as {
        access_token?: string;
        token_type?: string;
        error?: string;
      };

      if (!data.access_token) {
        throw createApiServiceError(`Runscope OAuth error: ${data.error || 'Unknown error'}`);
      }

      return {
        output: {
          token: data.access_token,
          runscopeToken: data.access_token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: {}; scopes: string[] }) => {
      let data = await new RunscopeClient({ token: ctx.output.token }).getAccount();
      if (!data?.uuid) {
        throw createApiServiceError(
          'API Monitoring did not return an authenticated account UUID.'
        );
      }

      return {
        profile: {
          id: data.uuid,
          name: data.name ?? undefined,
          email: data.email ?? undefined
        }
      };
    }
  });
