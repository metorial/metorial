import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Tripadvisor API key'),
      reviewExpressToken: z.string().optional().describe('Review Express connectivity API key')
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
          'Your Tripadvisor Content API key. Obtain one at www.tripadvisor.com/developers.'
        ),
      reviewExpressToken: z
        .string()
        .optional()
        .describe(
          'Optional separate Review Express connectivity API key for hotel review requests and mapped properties. If omitted, the primary key is used.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          reviewExpressToken: ctx.input.reviewExpressToken
        }
      };
    }
  });
