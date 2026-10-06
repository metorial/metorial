import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client, instanceUrl } from './lib/client';

export const auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      instanceUrl: z
        .string()
        .optional()
        .describe('Instance origin bound when the key was connected')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'Management API key scoped to one workspace with read and required write permissions.'
        ),
      baseUrl: z
        .string()
        .optional()
        .describe(
          'HTTPS origin of the matching self-hosted instance. Omit for Formbricks Cloud.'
        )
    }),
    getOutput: async ctx => {
      const origin = instanceUrl(ctx.input.baseUrl ?? ctx.config?.baseUrl);
      new Client({ token: ctx.input.apiKey, baseUrl: origin });
      return { output: { token: ctx.input.apiKey, instanceUrl: origin } };
    },
    getProfile: async (ctx: {
      output: { token: string; instanceUrl?: string };
      config?: { baseUrl?: string };
    }) => {
      const me = await new Client({
        token: ctx.output.token,
        instanceUrl: ctx.output.instanceUrl,
        baseUrl: ctx.config?.baseUrl
      }).getMe();
      return {
        profile: {
          id: me.workspace?.id ?? me.project.id,
          name: me.workspace?.name ?? me.project.name,
          environment: me.type
        }
      };
    }
  });
