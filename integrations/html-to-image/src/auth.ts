import { createApiServiceError, SlateAuth } from 'slates';
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
      userId: z
        .string()
        .describe('Your API ID (formerly User ID) from the HTML/CSS to Image dashboard'),
      apiKey: z.string().describe('Your API Key from the HTML/CSS to Image dashboard')
    }),
    getOutput: async ctx => {
      if (
        !ctx.input.userId.trim() ||
        ctx.input.userId.includes(':') ||
        !ctx.input.apiKey.trim()
      ) {
        throw createApiServiceError(
          'Provide a valid API ID and API key from the HTML/CSS to Image dashboard.'
        );
      }
      return {
        output: {
          userId: ctx.input.userId,
          token: ctx.input.apiKey
        }
      };
    }
  });
