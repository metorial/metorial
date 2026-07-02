import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { cloudflareWorkersApiError, cloudflareWorkersApiResponseError } from './lib/errors';

let ensureSuccessfulCloudflareResponse = (response: {
  data?: unknown;
  status?: number;
  statusText?: string;
}) => {
  let data = response.data;
  if (
    data &&
    typeof data === 'object' &&
    'success' in data &&
    (data as { success?: unknown }).success === false
  ) {
    throw cloudflareWorkersApiResponseError(response);
  }
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      email: z.string().optional(),
      authType: z.enum(['api_token', 'global_api_key'])
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Cloudflare API Token. Created via My Profile > API Tokens in the Cloudflare dashboard.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          authType: 'api_token' as const
        }
      };
    },
    getProfile: async (ctx: {
      output: { token: string; email?: string; authType: string };
      input: { token: string };
    }) => {
      try {
        let http = createAxios({
          baseURL: 'https://api.cloudflare.com/client/v4',
          headers: {
            Authorization: `Bearer ${ctx.output.token}`
          }
        });
        let response = await http.get('/user/tokens/verify');
        ensureSuccessfulCloudflareResponse(response);
        let result = response.data.result;
        return {
          profile: {
            id: result.id,
            status: result.status
          }
        };
      } catch (error) {
        throw cloudflareWorkersApiError(error, 'verify API token');
      }
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Global API Key',
    key: 'global_api_key',
    inputSchema: z.object({
      email: z.string().describe('Cloudflare account email address.'),
      token: z
        .string()
        .describe(
          'Cloudflare Global API Key. Found under My Profile > API Tokens in the dashboard.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          email: ctx.input.email,
          authType: 'global_api_key' as const
        }
      };
    },
    getProfile: async (ctx: {
      output: { token: string; email?: string; authType: string };
      input: { email: string; token: string };
    }) => {
      try {
        let http = createAxios({
          baseURL: 'https://api.cloudflare.com/client/v4',
          headers: {
            'X-Auth-Email': ctx.output.email!,
            'X-Auth-Key': ctx.output.token
          }
        });
        let response = await http.get('/user');
        ensureSuccessfulCloudflareResponse(response);
        let user = response.data.result;
        return {
          profile: {
            id: user.id,
            email: user.email,
            name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || undefined
          }
        };
      } catch (error) {
        throw cloudflareWorkersApiError(error, 'verify global API key');
      }
    }
  });
