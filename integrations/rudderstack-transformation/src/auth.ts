import { createApiServiceError, SlateAuth } from 'slates';
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
          'Workspace-level Service Access Token (recommended) with Transformations Create & Delete, Connect and Edit, Transformation Libraries Edit and Destinations Connect permissions; or a Personal Access Token with Read-Write role for testing/personal use. This management API uses Bearer auth, separate from the Basic-auth Test API.'
        )
    }),
    getOutput: async ctx => {
      if (!ctx.input.serviceAccessToken.trim())
        throw createApiServiceError(
          'Provide a RudderStack Service Access Token or Personal Access Token.'
        );
      return {
        output: {
          token: ctx.input.serviceAccessToken.trim()
        }
      };
    }
  });
