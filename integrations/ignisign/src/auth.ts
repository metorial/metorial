import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { getApiKeyScope, IgnisignClient } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('IgniSign API key'),
      appId: z.string().optional(),
      appEnv: z.string().optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiSecret: z
        .string()
        .describe('API key beginning with skv2_ from the IgniSign Console API Keys section')
    }),
    getOutput: async ctx => {
      let token = ctx.input.apiSecret.trim();
      let scope = getApiKeyScope(token);
      if (!scope)
        throw createApiServiceError(
          'Create a current API key beginning with skv2_ in the IgniSign Console.'
        );
      return { output: { token, ...scope } };
    },
    getProfile: async (ctx: {
      output: { token: string; appId?: string; appEnv?: string };
    }) => {
      let client = new IgnisignClient(ctx.output);
      let application = await client.getApplicationContext();
      return {
        profile: {
          id: ctx.output.appId,
          name: application.appName ?? application.name ?? 'IgniSign Application'
        }
      };
    }
  });
