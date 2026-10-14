import { SlateAuth } from 'slates';
import { z } from 'zod';
import { TelTelClient } from './lib/client';

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
      apiKey: z.string().describe('TelTel API key found under Settings in your TelTel account')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let users = await new TelTelClient(ctx.output.token).listUsers();
      let user = users.find(user => user.api_key === ctx.output.token);

      return {
        profile: {
          id: user?.id?.toString(),
          name: user?.display_name ?? user?.realname ?? user?.name
        }
      };
    }
  });
