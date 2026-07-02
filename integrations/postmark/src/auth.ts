import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { postmarkApiError } from './lib/errors';

let postmarkAxios = createAxios({
  baseURL: 'https://api.postmarkapp.com'
});

postmarkAxios.interceptors?.response?.use(
  response => response,
  error => Promise.reject(postmarkApiError(error, 'profile lookup'))
);

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      accountToken: z.string().optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Server API Token',
    key: 'server_token',

    inputSchema: z.object({
      serverToken: z.string().min(1),
      accountToken: z.string().optional()
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.serverToken,
          accountToken: ctx.input.accountToken
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; accountToken?: string };
      input: { serverToken: string; accountToken?: string };
    }) => {
      let response = await postmarkAxios.get('/server', {
        headers: {
          Accept: 'application/json',
          'X-Postmark-Server-Token': ctx.output.token
        }
      });

      let data = response.data;

      return {
        profile: {
          id: String(data.ID),
          name: data.Name
        }
      };
    }
  });
