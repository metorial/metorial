import { SlateAuth } from 'slates';
import { z } from 'zod';
import { DailyBotClient } from './lib/client';

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
        .describe('DailyBot API Key generated from Organization Settings > Integrations')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let data = await new DailyBotClient({ token: ctx.output.token }).getMe(true);

      return {
        profile: {
          id: data.uuid ?? data.id,
          name:
            data.full_name ??
            data.name ??
            [data.first_name, data.last_name].filter(Boolean).join(' '),
          email: data.email
        }
      };
    }
  });
