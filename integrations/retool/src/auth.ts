import { SlateAuth } from 'slates';
import { z } from 'zod';
import { connectionFor } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      baseUrl: z.string().optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Access Token',
    key: 'api_access_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Retool API access token from Settings > Retool API. Select only the scopes needed by your tools; availability depends on the organization and deployment.'
        ),
      baseUrl: z
        .string()
        .optional()
        .describe(
          'Retool instance origin for your organization or Space, including a self-hosted port when needed. Defaults to the documented legacy cloud API origin https://api.retool.com. Use the target organization or Space domain when required.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          ...connectionFor({ auth: ctx.input, config: ctx.config })
        }
      };
    }
  });
