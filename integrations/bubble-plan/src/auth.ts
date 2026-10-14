import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      domain: z.string().optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      apiKey: z.string().describe('Your Project Bubble API key from the My Account page'),
      domain: z
        .string()
        .describe('Your Project Bubble account domain, such as example.projectbubble.com')
    }),

    getOutput: async ctx => {
      new Client({ token: ctx.input.apiKey, domain: ctx.input.domain });
      return {
        output: {
          token: ctx.input.apiKey.trim(),
          domain: ctx.input.domain.trim()
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; domain?: string };
      config?: Record<string, unknown>;
    }) => {
      let client = new Client({
        token: ctx.output.token,
        domain: ctx.output.domain ?? ctx.config?.domain
      });
      let result = await client.getCurrentUser();
      let user = result?.data?.[0] || result?.data || result;
      if (!user?.user_id) {
        throw createApiServiceError('Project Bubble did not return the authenticated user.', {
          reason: 'missing_authenticated_user'
        });
      }

      return {
        profile: {
          id: String(user.user_id),
          email: user.email || '',
          name: [user.first_name, user.last_name].filter(Boolean).join(' ') || undefined,
          imageUrl: user.avatar || undefined
        }
      };
    }
  });
