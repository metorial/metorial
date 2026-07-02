import { SlateAuth } from 'slates';
import { z } from 'zod';
import { cloudflareApiError, cloudflareApiResponseError } from './lib/errors';

let cloudflareApiBaseUrl = 'https://api.cloudflare.com/client/v4';

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let parseCloudflareResponse = async (response: Response) => {
  let contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
};

let requestCloudflareProfile = async (
  path: string,
  headers: Record<string, string>,
  operation = 'profile lookup'
) => {
  let response = await fetch(`${cloudflareApiBaseUrl}${path}`, { headers });
  let data = await parseCloudflareResponse(response);

  if (!response.ok || (isRecord(data) && data.success === false)) {
    throw cloudflareApiResponseError(
      {
        status: response.status,
        statusText: response.statusText,
        data
      },
      operation
    );
  }

  return data as { result?: unknown };
};

let profileFromUser = (userData: Record<string, unknown>) => {
  let firstName = typeof userData.first_name === 'string' ? userData.first_name : '';
  let lastName = typeof userData.last_name === 'string' ? userData.last_name : '';
  let email = typeof userData.email === 'string' ? userData.email : undefined;
  let id = typeof userData.id === 'string' ? userData.id : email;
  let name = `${firstName} ${lastName}`.trim() || email || id || 'Cloudflare user';

  return {
    id: id ?? name,
    email,
    name
  };
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
          'Cloudflare API Token. Create one from My Profile > API Tokens in the Cloudflare dashboard.'
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

    getProfile: async (ctx: any) => {
      let headers = {
        Authorization: `Bearer ${ctx.output.token}`
      };

      try {
        await requestCloudflareProfile('/user/tokens/verify', headers);

        let userResponse = await requestCloudflareProfile('/user', headers);
        let userData = userResponse.result;
        if (!isRecord(userData)) {
          throw cloudflareApiResponseError(
            {
              status: 200,
              statusText: 'OK',
              data: userResponse
            },
            'profile lookup'
          );
        }

        return {
          profile: profileFromUser(userData)
        };
      } catch (error) {
        throw cloudflareApiError(error, 'profile lookup');
      }
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Global API Key',
    key: 'global_api_key',

    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Cloudflare Global API Key. Found in My Profile > API Tokens > Global API Key.'
        ),
      email: z
        .string()
        .describe('Cloudflare account email address associated with the Global API Key.')
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

    getProfile: async (ctx: any) => {
      let headers = {
        'X-Auth-Email': ctx.output.email!,
        'X-Auth-Key': ctx.output.token
      };

      try {
        let response = await requestCloudflareProfile('/user', headers);
        let userData = response.result;
        if (!isRecord(userData)) {
          throw cloudflareApiResponseError(
            {
              status: 200,
              statusText: 'OK',
              data: response
            },
            'profile lookup'
          );
        }

        return {
          profile: profileFromUser(userData)
        };
      } catch (error) {
        throw cloudflareApiError(error, 'profile lookup');
      }
    }
  });
