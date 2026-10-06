import { SlateAuth } from 'slates';
import { z } from 'zod';
import { type AuthOutput, connection } from './lib/connection';

export const auth = SlateAuth.create()
  .output(z.object({ token: z.string(), baseUrl: z.string().optional() }))
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Raw n8n Public API key from Settings → n8n API. Sent in X-N8N-API-KEY; API access, scopes and instance permissions must permit the operation.'
        ),
      baseUrl: z
        .string()
        .optional()
        .describe(
          'Explicit HTTP or HTTPS n8n instance API root ending in /api/v1, including deployment path and port. HTTP sends the key without transport encryption. Older connections may use their saved instance configuration.'
        )
    }),
    getOutput: async ctx => ({
      output: connection({ token: ctx.input.token, baseUrl: ctx.input.baseUrl }, ctx.config)
    }),
    getProfile: async (ctx: { output: AuthOutput; config?: unknown }) => {
      const saved = connection(ctx.output, ctx.config);
      return {
        profile: {
          baseUrl: saved.baseUrl,
          transport: saved.baseUrl.startsWith('https:')
            ? 'HTTPS'
            : 'HTTP; API key is sent without transport encryption',
          authentication:
            'API key; no current-user identity is available through this connection',
          verification:
            'Configured instance binding; native capability access can be checked with discover_api.'
        }
      };
    }
  });
