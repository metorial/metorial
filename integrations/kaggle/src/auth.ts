import { createApiServiceError, SlateAuth } from 'slates';
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
    name: 'Legacy API Key',
    key: 'api_key',
    inputSchema: z.object({
      username: z.string().describe('Your Kaggle username'),
      apiKey: z
        .string()
        .describe(
          'Legacy API key from the key field in kaggle.json; create it under Legacy API Credentials at kaggle.com/settings/api. This is not a personal API token.'
        )
    }),
    getOutput: async ctx => {
      if (
        !ctx.input.username.trim() ||
        ctx.input.username.includes(':') ||
        !ctx.input.apiKey.trim()
      )
        throw createApiServiceError(
          'Provide your Kaggle username and a valid legacy API key.'
        );
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
