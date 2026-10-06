import { createHash } from 'node:crypto';
import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';
import { baseUrl, invalid, token } from './lib/validation';

export let auth = SlateAuth.create()
  .output(z.object({ token: z.string(), baseUrl: z.string().optional() }))
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z.string().describe('Documenso team API token including its api_ prefix'),
      baseUrl: z
        .string()
        .optional()
        .describe(
          'HTTPS instance API base URL ending in /api/v2; defaults to https://app.documenso.com/api/v2'
        )
    }),
    getOutput: async ctx => {
      const output = { token: token(ctx.input.token), baseUrl: baseUrl(ctx.input.baseUrl) };
      await new Client(output).findEnvelopes({ page: 1, perPage: 1 });
      return { output };
    },
    getProfile: async (ctx: { output: { token: string; baseUrl?: string } }) => {
      if (ctx.output.baseUrl === undefined)
        throw invalid(
          'Reconnect to bind this API token to its Documenso instance before validating the connection profile. Existing tools retain their stored instance.'
        );
      const instance = baseUrl(ctx.output.baseUrl);
      await new Client({ token: ctx.output.token, baseUrl: instance }).findEnvelopes({
        page: 1,
        perPage: 1
      });
      return {
        profile: {
          authenticationMode: 'api_token',
          instance,
          envelopeReadValidated: true,
          connectionFingerprint: createHash('sha256')
            .update(`${instance}\0${ctx.output.token}`)
            .digest('hex')
        }
      };
    }
  });
