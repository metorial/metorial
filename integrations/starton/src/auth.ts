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
      apiKey: z.string().describe('Starton API key from the Developer section of your project')
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
        baseURL: 'https://api.starton.com/v3',
        headers: {
          'x-api-key': ctx.output.token
        }
      });

      let response = await axios.get('/project');
      let project = response.data;

      return {
        profile: {
          id: project.id,
          name: project.name
        }
      };
    }
  });
