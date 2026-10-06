import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client, tokenEnvironment } from './lib/client';
import { fail, readAccount, requireId, requireText } from './lib/response';

export const auth = SlateAuth.create()
  .output(z.object({ token: z.string().describe('Breathe HR API key') }))
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'API key from account API settings: prod- for production or sandbox- for sandbox. Select the matching environment.'
        )
    }),
    getOutput: async ctx => {
      const environment = tokenEnvironment(ctx.input.token);
      if (ctx.config?.environment !== undefined && ctx.config.environment !== environment)
        fail('Select the environment matching the API key prefix before connecting.');
      return { output: { token: ctx.input.token } };
    },
    getProfile: async (ctx: {
      output: { token: string };
      input: { token: string };
      config?: { environment?: string };
      scopes: string[];
    }) => {
      const environment = ctx.config?.environment ?? tokenEnvironment(ctx.output.token);
      const account = readAccount(
        await new Client({ token: ctx.output.token, environment }).getAccount()
      );
      return {
        profile: {
          id:
            account.uuid === undefined || account.uuid === null
              ? requireId(account.id)
              : requireText(account.uuid, 'account UUID'),
          name: requireText(account.name, 'account name')
        }
      };
    }
  });
