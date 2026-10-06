import { SlateAuth } from 'slates';
import { z } from 'zod';
import { environment, environments, required } from './lib/validation';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      environment: z.enum(environments).optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'TaxJar API token. Find it in Account > API Access in your TaxJar dashboard. Use a separately generated sandbox token for sandbox.'
        ),
      environment: z
        .enum(environments)
        .optional()
        .describe(
          'Credential environment. Defaults to production; sandbox requires its own token.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: required(ctx.input.token, 'API token'),
          environment: environment(ctx.input.environment ?? ctx.config?.environment)
        }
      };
    }
  });
