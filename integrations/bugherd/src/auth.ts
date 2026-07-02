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
      token: z.string().describe('BugHerd API key found under Settings > General Settings')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let client = createAxios({
        baseURL: 'https://www.bugherd.com/api_v2',
        auth: {
          username: ctx.output.token,
          password: 'x'
        }
      });

      let response = await client.get('/organization.json');
      let org = response.data.organization;

      return {
        profile: {
          id: String(org.id),
          name: org.name
        }
      };
    }
  });
