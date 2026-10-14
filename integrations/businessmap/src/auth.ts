import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      subdomain: z.string(),
      domain: z.enum(['kanbanize.com', 'businessmap.io']).optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z.string().describe('Your Businessmap API key. Find it under My Account > API.'),
      subdomain: z
        .string()
        .describe(
          'Your account subdomain, for example "mycompany" from mycompany.businessmap.io. Enter only the subdomain.'
        ),
      domain: z
        .enum(['kanbanize.com', 'businessmap.io'])
        .optional()
        .describe(
          'The domain used to sign in to your account. Defaults to kanbanize.com for existing connections.'
        )
    }),
    getOutput: async ctx => ({
      output: {
        token: ctx.input.token,
        subdomain: ctx.input.subdomain.trim(),
        domain: ctx.input.domain ?? 'kanbanize.com'
      }
    }),
    getProfile: async (ctx: {
      output: {
        token: string;
        subdomain: string;
        domain?: 'kanbanize.com' | 'businessmap.io';
      };
    }) => {
      let user = await new Client(ctx.output).getCurrentUser();
      return {
        profile: {
          id: String(user.user_id),
          email: user.email,
          name: user.realname || user.username
        }
      };
    }
  });
