import { SlateAuth } from 'slates';
import { z } from 'zod';
import { appUrl, text } from './lib/validation';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().optional(),
      appBaseUrl: z.string().optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Bubble admin API token or externally obtained user token. Admin tokens bypass privacy rules; user tokens obey them and may expire. This connection does not log users in or refresh their tokens.'
        ),
      appBaseUrl: z
        .string()
        .optional()
        .describe(
          'Exact HTTPS API URL from Bubble Settings → API, ending in /api/1.1, optionally with a branch. Binds this token to that instance; omit only for a legacy connection that already has its URL in configuration.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: text(ctx.input.token, 'Bearer token'),
          ...(ctx.input.appBaseUrl === undefined
            ? {}
            : { appBaseUrl: appUrl(ctx.input.appBaseUrl) })
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    key: 'public_api',
    name: 'Public API',
    inputSchema: z.object({
      appBaseUrl: z
        .string()
        .describe(
          'Exact HTTPS API URL of the public Bubble app, including /api/1.1 and its branch if needed.'
        )
    }),
    getOutput: async ctx => ({ output: { appBaseUrl: appUrl(ctx.input.appBaseUrl) } })
  })
  .addNone();
