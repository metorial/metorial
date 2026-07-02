import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Service Access Token',
    key: 'service_access_token',
    inputSchema: z.object({
      serviceAccessToken: z
        .string()
        .describe(
          'Workspace-level Service Access Token (SAT) or Personal Access Token (PAT). Generate this from your RudderStack dashboard with appropriate permissions for Transformations and Libraries.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.serviceAccessToken
        }
      };
    }
  });
