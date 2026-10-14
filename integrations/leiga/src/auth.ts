import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  requestAxiosData,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import type { LeigaResponse } from './lib/client';
import { assertLeigaResponse } from './lib/response';

let api = createAxios({
  baseURL: 'https://app.leiga.com/openapi/api',
  timeout: 30000
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Client Credentials',
    key: 'client_credentials',

    inputSchema: z.object({
      clientId: z.string().describe('Client ID from Leiga API settings'),
      secretKey: z.string().describe('Secret Key from Leiga API settings')
    }),

    getOutput: async ctx => {
      let data = await requestAxiosData<LeigaResponse<{ accessToken: string }>>(
        'authorize',
        () =>
          api.post('/authorize/access-permanent-token', {
            clientId: ctx.input.clientId,
            secretKey: ctx.input.secretKey
          }),
        (error, operation) =>
          buildApiServiceError(error, {
            providerLabel: 'Leiga',
            reason: 'leiga_auth_error',
            operation,
            detailKeys: ['msg', 'message', 'code']
          })
      );
      assertLeigaResponse(data, 'authorization');

      if (typeof data.data?.accessToken !== 'string' || !data.data.accessToken.trim()) {
        throw createApiServiceError(
          'Leiga did not return an access token. Check the client credentials and OpenAPI module permissions.',
          { reason: 'leiga_auth_error' }
        );
      }

      return {
        output: {
          token: data.data.accessToken
        }
      };
    }
  });
