import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client, requireArray } from './lib/client';

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
      token: z.string().describe('TimelinesAI API token from Integrations > Public API')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let client = new Client({ token: ctx.output.token });
      let response = await client.getWorkspaceTeammates();
      let teammates = requireArray(response?.data?.teammates, 'teammates');
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
