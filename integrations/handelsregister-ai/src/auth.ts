import { ServiceError } from '@lowerdeck/error';
import { SlateAuth } from 'slates';
import { z } from 'zod';
import { type HandelsregisterAuth, mapAccount } from './lib/client';
import { API_BASE_URL } from './lib/constants';
import { handelsregisterError } from './lib/errors';

const authOutputSchema = z.object({ token: z.string() });

async function getProfile(auth: HandelsregisterAuth) {
  try {
    let response = await fetch(`${API_BASE_URL}/account`, {
      headers: { 'x-api-key': auth.token, Accept: 'application/json' },
      redirect: 'error',
      signal: AbortSignal.timeout(30_000)
    });
    if (!response.ok)
      throw handelsregisterError({ response: { status: response.status } }, 'verify account');
    let { account } = mapAccount(await response.json());
    return {
      profile: {
        ...(account.id == null ? {} : { id: String(account.id) }),
        ...(account.name == null ? {} : { name: account.name }),
        ...(account.email == null ? {} : { email: account.email })
      }
    };
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw handelsregisterError(error, 'verify account');
  }
}

export const auth = SlateAuth.create()
  .output(authOutputSchema)
  .addTokenAuth({
    type: 'auth.token',
    key: 'api_key',
    name: 'API Key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .trim()
        .min(1)
        .describe(
          'API key from your Handelsregister.ai dashboard at https://handelsregister.ai.'
        )
    }),
    getOutput: async ctx => ({
      output: { token: ctx.input.apiKey }
    }),
    getProfile: async (ctx: { output: z.infer<typeof authOutputSchema> }) =>
      getProfile(ctx.output)
  });
