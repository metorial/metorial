import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      userId: z.string(),
      token: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Credentials',
    key: 'api_credentials',
    inputSchema: z.object({
      userId: z.string().describe('Your User ID from the HTML/CSS to Image dashboard'),
      apiKey: z.string().describe('Your API Key from the HTML/CSS to Image dashboard')
    }),
    getOutput: async ctx => {
      return {
        output: {
          userId: ctx.input.userId,
          token: ctx.input.apiKey
        }
      };
    }
  });
