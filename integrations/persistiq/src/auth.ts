import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'PersistIQ API key. Found under Profile > Integrations > PersistIQ API in your dashboard.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let axios = createAxios({
        baseURL: 'https://api.persistiq.com/v1',
        headers: {
          'x-api-key': ctx.output.token
        }
      });

      let response = await axios.get('/users');
      let users = response.data?.users;

      if (users && users.length > 0) {
        let user = users[0];
        return {
          profile: {
            id: user.id,
            email: user.email,
            name: user.name
          }
        };
      }

      return {
        profile: {}
      };
    }
  });
