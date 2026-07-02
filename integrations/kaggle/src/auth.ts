import { SlateAuth } from 'slates';
import { z } from 'zod';

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
      username: z.string().describe('Your Kaggle username'),
      apiKey: z.string().describe('Your Kaggle API key (from kaggle.com/settings)')
    }),
    getOutput: async ctx => {
      let basicToken = Buffer.from(`${ctx.input.username}:${ctx.input.apiKey}`).toString(
        'base64'
      );
      return {
        output: {
          token: basicToken,
          username: ctx.input.username
        }
      };
    },
    getProfile: async (ctx: {
      output: { token: string; username: string };
      input: { username: string; apiKey: string };
    }) => {
      return {
        profile: {
          name: ctx.output.username,
          id: ctx.output.username
        }
      };
    }
  });
