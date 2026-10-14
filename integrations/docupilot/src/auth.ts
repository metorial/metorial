import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';

import { Client } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      workspaceId: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',

    name: 'API Key + Secret',
    key: 'api_key_secret',

    inputSchema: z.object({
      apiKey: z.string().describe('API Key generated from Settings > API Settings'),
      apiSecret: z.string().describe('API Secret provided at key creation time'),
      workspaceId: z
        .string()
        .describe('Workspace ID found on the Workspace details page in Settings')
    }),

    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim() || !ctx.input.apiSecret || !ctx.input.workspaceId.trim()) {
        throw createApiServiceError('Enter your Docupilot API key, secret, and workspace ID.');
      }
      let encoded = Buffer.from(`${ctx.input.apiKey}:${ctx.input.apiSecret}`, 'utf8').toString(
        'base64'
      );
      return {
        output: {
          token: encoded,
          workspaceId: ctx.input.workspaceId
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; workspaceId: string };
      input: { apiKey: string; apiSecret: string; workspaceId: string };
    }) => {
      let user = await new Client(ctx.output).getCurrentUser();
      let id = user.id == null ? user.email : String(user.id);
      if (!id) {
        throw createApiServiceError(
          'Docupilot did not return a user identity. Verify your API credentials.'
        );
      }
      return {
        profile: {
          id,
          email: user.email ?? '',
          name: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email || ''
        }
      };
    }
  });
