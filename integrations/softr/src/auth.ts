import { SlateAuth } from 'slates';
import { connection, z } from './lib/validation';
export const auth = SlateAuth.create()
  .output(z.object({ token: z.string(), domain: z.string().optional() }))
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal Access Token',
    key: 'api_key',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Personal access token from workspace API tokens. Select the required workspace scopes and permissions; reconnect when it expires.'
        ),
      domain: z
        .string()
        .optional()
        .describe(
          'Published app hostname for user operations, such as example.softr.app. Database operations do not require an app domain.'
        )
    }),
    getOutput: async ctx => ({ output: connection(ctx.input, ctx.config) })
  });
