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
    name: 'API Token',
    key: 'api_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe('Your Elorus API key. Found in User Profile in the Elorus web application.')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let axios = createAxios({
        baseURL: 'https://api.elorus.com/v1.2/'
      });

      let response = await axios.get('/organization/', {
        headers: {
          Authorization: `Token ${ctx.output.token}`,
          'Content-Type': 'application/json'
        }
      });

      let org = response.data;
      return {
        profile: {
          id: org.id,
          name: org.name || org.company
        }
      };
    }
  });
