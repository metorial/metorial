import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client, optionalText, text } from './lib/client';

export let auth = SlateAuth.create()
  .output(z.object({ token: z.string() }))
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Your Lemlist API key from Settings > Integrations. It identifies the team and is sent using HTTP Basic authentication.'
        )
    }),
    getOutput: async ctx => {
      await new Client({ token: ctx.input.token }).getTeam();
      return { output: { token: ctx.input.token } };
    },
    getProfile: async (ctx: { output: { token: string } }) => {
      const team = await new Client({ token: ctx.output.token }).getTeam();
      return {
        profile: {
          id: text(team._id, 'team identifier'),
          name: optionalText(team.name) ?? 'Lemlist team'
        }
      };
    }
  });
