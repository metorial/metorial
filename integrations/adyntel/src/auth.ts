import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      email: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key & Email',
    key: 'api_key_email',

    inputSchema: z.object({
      apiKey: z.string().describe('Your Adyntel API key from platform.adyntel.com'),
      email: z
        .string()
        .email()
        .describe('The email address used to register your Adyntel account')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          email: ctx.input.email
        }
      };
    }
  });
