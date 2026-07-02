import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z
        .string()
        .describe(
          'Service Access Token (SAT) or Personal Access Token (PAT) for Control Plane and Management APIs.'
        ),
      sourceWriteKey: z
        .string()
        .optional()
        .describe(
          'Source Write Key for the HTTP/Event API (Data Plane). Required only when sending events.'
        )
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Access Token',
    key: 'access_token',
    inputSchema: z.object({
      serviceAccessToken: z
        .string()
        .describe(
          'Service Access Token (SAT) or Personal Access Token (PAT). Found in the RudderStack dashboard under Settings > Access Tokens.'
        ),
      sourceWriteKey: z
        .string()
        .optional()
        .describe(
          'Source Write Key for sending events via the HTTP API. Found in the source settings in the RudderStack dashboard.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.serviceAccessToken,
          sourceWriteKey: ctx.input.sourceWriteKey
        }
      };
    }
  });
