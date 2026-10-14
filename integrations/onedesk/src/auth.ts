import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { Client, unwrapOneDeskResponse } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      authMethod: z.enum(['api_key', 'legacy_token'])
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe('Your OneDesk Public API key. Generate one in Admin > Integrations > API.')
    }),
    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim()) {
        throw createApiServiceError('Provide a OneDesk Public API key.', {
          reason: 'invalid_auth'
        });
      }
      return {
        output: {
          token: ctx.input.apiKey,
          authMethod: 'api_key' as const
        }
      };
    },
    getProfile: async (ctx: {
      output: { token: string; authMethod: string };
      input: { apiKey: string };
    }) => {
      let client = new Client(ctx.output);
      let org = await client.getOrganizationProfile();
      return {
        profile: {
          name: org.organizationName || org.name || 'OneDesk Organization'
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Email & Password (Legacy)',
    key: 'legacy_token',
    inputSchema: z.object({
      email: z.string().describe('Your OneDesk account email address.'),
      password: z.string().describe('Your OneDesk account password.')
    }),
    getOutput: async ctx => {
      let http = createAuthenticatedAxios({
        baseURL: 'https://app.onedesk.com/rest/2.0',
        errorAdapter: error =>
          buildApiServiceError(error, {
            providerLabel: 'OneDesk',
            reason: 'onedesk_auth_error',
            operation: 'login'
          })
      });
      let response = await http.post('/login/loginUser', {
        email: ctx.input.email,
        password: ctx.input.password
      });
      let result = unwrapOneDeskResponse(response.data);
      let authToken =
        typeof result === 'string'
          ? result
          : isApiErrorRecord(result)
            ? result.authenticationToken
            : undefined;
      if (typeof authToken !== 'string' || !authToken.trim()) {
        throw createApiServiceError(
          'Failed to authenticate with OneDesk. Check your email and password.',
          { reason: 'invalid_auth' }
        );
      }
      return {
        output: {
          token: authToken,
          authMethod: 'legacy_token' as const
        }
      };
    }
  });
