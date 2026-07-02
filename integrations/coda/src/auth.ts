import { SlateAuth } from 'slates';
import { z } from 'zod';
import { codaApiError } from './lib/errors';
import { createCodaHttp } from './lib/http';

let http = createCodaHttp();

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe('Coda API token. Generate one from Account Settings > API Settings.')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let response: any;
      try {
        response = await http.get('/whoami', {
          headers: {
            Authorization: `Bearer ${ctx.output.token}`
          }
        });
      } catch (error) {
        throw codaApiError(error, 'get profile');
      }

      return {
        profile: {
          id: response.data.loginId,
          name: response.data.name,
          email: response.data.loginId
        }
      };
    }
  });
