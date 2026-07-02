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
    name: 'Personal Access Token',
    key: 'personal_access_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Ninox Personal Access Token. Generate one from the Ninox web app under Actions (gear icon) > Integrations > Generate.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let axiosInstance = createAxios({
        baseURL: 'https://api.ninox.com/v1',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let response = await axiosInstance.get('/teams');
      let teams = response.data as Array<{ id: string; name: string }>;

      return {
        profile: {
          name:
            teams.length > 0
              ? `Ninox User (${teams.length} team${teams.length !== 1 ? 's' : ''})`
              : 'Ninox User'
        }
      };
    }
  });
