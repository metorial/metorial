import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      webhookAppSecret: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Access Token',
    key: 'access_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Permanent access token generated from a System User in Meta Business Manager, or a temporary token from the Meta App Dashboard'
        ),
      webhookAppSecret: z
        .string()
        .min(1)
        .describe('Meta App Secret used to authenticate WhatsApp webhook deliveries')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          webhookAppSecret: ctx.input.webhookAppSecret
        }
      };
    }
  });
