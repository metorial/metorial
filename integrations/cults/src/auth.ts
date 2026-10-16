import { SlateAuth } from 'slates';
import { z } from 'zod';
import { CultsClient } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      username: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',

    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      username: z.string().describe('Your Cults3D username'),
      token: z.string().describe('API key generated from https://cults3d.com/en/api/keys')
    }),

    getOutput: async ctx => {
      new CultsClient(ctx.input);
      return {
        output: {
          token: ctx.input.token,
          username: ctx.input.username
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; username: string };
      input: { username: string; token: string };
    }) => {
      let user = await new CultsClient(ctx.output).getAuthenticationProfile();

      return {
        profile: {
          id: user.nick,
          name: user.nick,
          imageUrl: user.imageUrl
        }
      };
    }
  });
