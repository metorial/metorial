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
      token: z
        .string()
        .describe('Your Lemlist API key. Found in Settings > Integrations in the Lemlist app.')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let apiAxios = createAxios({
        baseURL: 'https://api.lemlist.com/api'
      });

      let encoded = Buffer.from(`:${ctx.output.token}`).toString('base64');

      let response = await apiAxios.get('/team', {
        headers: {
          Authorization: `Basic ${encoded}`
        }
      });

      let team = response.data;

      return {
        profile: {
          id: team._id,
          name: team.name
        }
      };
    }
  });
