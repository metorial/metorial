import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z
        .string()
        .describe(
          'Combined OKSign authorization header value in the format: accountNumber;authToken;orgToken'
        ),
      accountNumber: z.string().describe('OKSign account number'),
      authToken: z.string().describe('UUID-style authentication token'),
      orgToken: z.string().describe('Organizational token label (e.g. marketing, sales)')
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'OKSign API Key',
    key: 'oksign_api_key',

    inputSchema: z.object({
      accountNumber: z.string().describe('Your OKSign account number'),
      authToken: z
        .string()
        .describe('UUID-style authentication token generated in your OKSign account'),
      orgToken: z.string().describe('Organizational token label (e.g. marketing, sales)')
    }),

    getOutput: async ctx => {
      let token = `${ctx.input.accountNumber};${ctx.input.authToken};${ctx.input.orgToken}`;
      return {
        output: {
          token,
          accountNumber: ctx.input.accountNumber,
          authToken: ctx.input.authToken,
          orgToken: ctx.input.orgToken
        }
      };
    }
  });
