import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client, environments } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      environment: z.enum(environments).optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Your Accredible API key. Found in Dashboard > Settings > API Integrations.'
        ),
      environment: z
        .enum(environments)
        .optional()
        .describe(
          'API environment for this key. Defaults to production_us; select production_eu or sandbox for keys issued there.'
        )
    }),
    getOutput: async ctx => ({
      output: { token: ctx.input.token, environment: ctx.input.environment }
    }),
    getProfile: async (ctx: { output: { token: string; environment?: string } }) => {
      let issuer = await new Client(ctx.output).getIssuer();
      return { profile: { id: String(issuer.id), name: issuer.name, email: issuer.email } };
    }
  });
