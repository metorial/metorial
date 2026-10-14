import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { FeatheryClient } from './lib/client';

let regionSchema = z.enum(['us', 'canada', 'europe', 'australia']);

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      region: regionSchema.optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z
        .string()
        .describe('Your environment-specific Feathery admin API key from account settings.'),
      region: regionSchema
        .default('us')
        .describe('Region where your Feathery account is hosted.')
    }),
    getOutput: async ctx => ({
      output: { token: ctx.input.token, region: ctx.input.region }
    }),
    getProfile: async (ctx: { output: { token: string; region?: string } }) => {
      let account = await new FeatheryClient(ctx.output).getAccount();
      if (typeof account.team !== 'string' || !account.team) {
        throw createApiServiceError(
          'Feathery did not return account team information. Check your API key and region.'
        );
      }
      return { profile: { id: account.team, name: account.team } };
    }
  });
