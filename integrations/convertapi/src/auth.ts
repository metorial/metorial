import { getApiErrorStatus, isApiErrorRecord, SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';
import { text } from './lib/validation';

export let auth = SlateAuth.create()
  .output(z.object({ token: z.string(), masterToken: z.string().optional() }))
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'ConvertAPI API token or JWT for conversions. Manage tokens at https://www.convertapi.com/a/authentication'
        ),
      masterToken: z
        .string()
        .optional()
        .describe(
          'Optional Owner or Admin Master Token for account information. Regular API tokens cannot read /user.'
        )
    }),
    getOutput: async ctx => {
      text(ctx.input.token, 'API token or JWT');
      if (ctx.input.masterToken !== undefined) text(ctx.input.masterToken, 'Master Token');
      return {
        output: {
          token: ctx.input.token,
          ...(ctx.input.masterToken === undefined
            ? {}
            : { masterToken: ctx.input.masterToken })
        }
      };
    },
    getProfile: async (ctx: { output: { token: string; masterToken?: string } }) => {
      const client = new Client(ctx.output);
      try {
        const user = await client.getUserInfo();
        return {
          profile: {
            id: user.apiKey === undefined ? user.email : String(user.apiKey),
            name: user.fullName,
            email: user.email
          }
        };
      } catch (error) {
        const status =
          getApiErrorStatus(error) ??
          (isApiErrorRecord(error) && isApiErrorRecord(error.data)
            ? error.data.upstreamStatus
            : undefined);
        if (!ctx.output.masterToken && (status === 401 || status === 403))
          return { profile: { name: 'ConvertAPI connection (account identity unavailable)' } };
        throw error;
      }
    }
  });
