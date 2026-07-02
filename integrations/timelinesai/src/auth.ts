import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let axios = createAxios({
  baseURL: 'https://app.timelines.ai/integrations/api'
});

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
      token: z.string().describe('TimelinesAI API token from Settings > API Access')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let response = await axios.get('/workspace/teammates', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let teammates = response.data?.data?.teammates || [];
      let owner = teammates.find((t: any) => t.role === 'owner') || teammates[0];

      return {
        profile: {
          id: owner?.user_id?.toString(),
          email: owner?.email,
          name: owner?.display_name
        }
      };
    }
  });
