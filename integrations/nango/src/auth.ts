import { SlateAuth } from 'slates';
import { baseUrl, tokenValue } from './lib/http';
import { z } from './lib/schemas';
export const auth = SlateAuth.create()
  .output(z.object({ token: z.string(), baseUrl: z.string().optional() }))
  .addTokenAuth({
    type: 'auth.token',
    name: 'Environment API Key',
    key: 'secret_key',
    inputSchema: z.object({
      secretKey: z
        .string()
        .min(1)
        .describe(
          'Nango Environment API key. Prefer custom permissions without read_credentials/list_credentials scopes. Account API keys do not work with these tools.'
        ),
      baseUrl: z
        .string()
        .optional()
        .describe(
          'Exact HTTPS origin of your Nango instance. Defaults to https://api.nango.dev; reconnect to bind a different instance.'
        )
    }),
    async getOutput(ctx) {
      return {
        output: {
          token: tokenValue(ctx.input.secretKey),
          baseUrl: baseUrl(ctx.input.baseUrl ?? ctx.config?.baseUrl ?? 'https://api.nango.dev')
        }
      };
    },
    async getProfile(ctx: {
      output: { token: string; baseUrl?: string };
      config?: Record<string, unknown>;
    }) {
      return {
        profile: {
          name: 'Nango Environment API key',
          baseUrl: baseUrl(
            ctx.output.baseUrl ?? ctx.config?.baseUrl ?? 'https://api.nango.dev'
          )
        }
      };
    }
  });
