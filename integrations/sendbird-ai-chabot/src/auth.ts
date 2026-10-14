import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      applicationId: z.string().optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',
    inputSchema: z.object({
      token: z
        .string()
        .min(1)
        .describe(
          'Sendbird API token (master or secondary). Found in Dashboard > Settings > Application > General > API tokens.'
        ),
      applicationId: z
        .string()
        .regex(/^[A-Za-z0-9][A-Za-z0-9-]{0,62}$/)
        .describe(
          'Sendbird Application ID from Dashboard > Settings > Application > General. This identifies the application API hostname and is case-sensitive.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          applicationId: ctx.input.applicationId
        }
      };
    }
  });
