import { SlateAuth } from 'slates';
import { z } from 'zod';
import { createSignPathClient } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('SignPath API bearer token'),
      organizationId: z
        .string()
        .optional()
        .describe('Organization associated with the API token'),
      baseUrl: z.string().optional().describe('SignPath instance URL')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',
    inputSchema: z.object({
      apiToken: z
        .string()
        .min(1)
        .describe('API token generated from SignPath user profile settings'),
      organizationId: z
        .string()
        .min(1)
        .describe(
          'Organization ID from your SignPath organization page or signing-policy API example'
        ),
      baseUrl: z
        .string()
        .default('https://app.signpath.io')
        .describe('Base URL of your SignPath instance')
    }),
    getOutput: async ctx => ({
      output: {
        token: ctx.input.apiToken,
        organizationId: ctx.input.organizationId,
        baseUrl: ctx.input.baseUrl
      }
    }),
    getProfile: async (ctx: {
      output: { token: string; organizationId?: string; baseUrl?: string };
    }) => {
      let user = await createSignPathClient({ auth: ctx.output }).getCurrentUser();
      return {
        profile: {
          id: user.userId,
          name: user.name,
          email:
            user.accountEmailAddress ??
            user.notificationEmailAddress.confirmedEmail ??
            undefined
        }
      };
    }
  });
