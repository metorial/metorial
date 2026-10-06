import { SlateAuth } from 'slates';
import { connection, z } from './lib/validation';
export const auth = SlateAuth.create()
  .output(z.object({ token: z.string(), baseUrl: z.string().optional() }))
  .addTokenAuth({
    type: 'auth.token',
    name: 'Configured Access Token',
    key: 'access_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Exact EXTERNAL_API_ACCESS_TOKEN value; it is sent as Basic without username/password encoding.'
        ),
      baseUrl: z
        .string()
        .optional()
        .describe(
          'Explicit ToolJet HTTP or HTTPS instance root, including any deployment path and port. Required for new connections.'
        )
    }),
    getOutput: async ctx => ({ output: connection(ctx.input, ctx.config) })
  });
