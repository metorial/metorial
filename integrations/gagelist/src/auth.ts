import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  requestAxiosData,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

export let auth = SlateAuth.create()
  .output(z.object({ token: z.string() }))
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Client Credentials',
    key: 'client_credentials',
    inputSchema: z.object({
      clientId: z.string().describe('Your GageList API client ID'),
      clientSecret: z.string().describe('Your GageList API client secret')
    }),
    getOutput: async ctx => {
      if (!ctx.input.clientId.trim() || !ctx.input.clientSecret.trim()) {
        throw createApiServiceError(
          'Provide both your GageList API client ID and client secret.'
        );
      }
      let params = new URLSearchParams({
        grant_type: 'password',
        client_id: ctx.input.clientId,
        client_secret: ctx.input.clientSecret
      });
      let response = await requestAxiosData<{ access_token?: unknown }>(
        'authenticate',
        () =>
          createAxios().post('https://gagelist.net/api/token', params.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
          }),
        (error, operation) =>
          buildApiServiceError(error, {
            providerLabel: 'GageList',
            operation,
            reason: 'gagelist_api_error'
          })
      );
      if (typeof response?.access_token !== 'string' || !response.access_token.trim()) {
        throw createApiServiceError(
          'GageList did not return an access token. Check your API credentials.'
        );
      }
      return { output: { token: response.access_token } };
    },
    getProfile: async (ctx: { output: { token: string } }) => {
      let response = await new Client(ctx.output).getAccountStatus();
      let name = response.data.RequestedSite?.Name ?? response.data.EnterpriseInfo?.Name;
      return {
        profile: { name: typeof name === 'string' && name.trim() ? name : 'GageList Account' }
      };
    }
  });
