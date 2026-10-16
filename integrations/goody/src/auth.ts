import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { GoodyClient, resolveGoodyEnvironment } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      environment: z.enum(['production', 'sandbox']).optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z.string().describe('Goody API key (Automation API or Commerce API key)'),
      environment: z
        .enum(['production', 'sandbox'])
        .optional()
        .describe(
          'Environment for this API key. Defaults to production. Sandbox requires a separate API key.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          environment: resolveGoodyEnvironment(ctx.input, ctx.config)
        }
      };
    },
    getProfile: async (ctx: {
      output: { token: string; environment?: string };
      input: { token: string; environment?: string };
      config?: unknown;
    }) => {
      let data = await new GoodyClient({
        token: ctx.output.token,
        environment: resolveGoodyEnvironment(ctx.output, ctx.config)
      }).getMe();
      let id = data.email || data.public_app_id;
      if (!id)
        throw createApiServiceError(
          'Goody did not return an email or public app ID for this API key.'
        );
      return {
        profile: {
          id,
          email: data.email ?? undefined,
          name: data.email || data.public_app_id
        }
      };
    }
  });
