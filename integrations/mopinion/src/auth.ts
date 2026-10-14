import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  requestAxiosData,
  SlateAuth
} from 'slates';
import { z } from 'zod';

let apiAxios = createAxios({
  baseURL: 'https://api.mopinion.com'
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      publicKey: z.string(),
      signatureToken: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Keys',
    key: 'api_keys',

    inputSchema: z.object({
      publicKey: z.string(),
      privateKey: z.string()
    }),

    getOutput: async ctx => {
      // Retrieve the signature token from the API using Basic Auth with public_key:private_key

      let credentials = Buffer.from(`${ctx.input.publicKey}:${ctx.input.privateKey}`).toString(
        'base64'
      );

      let response = await requestAxiosData<{ token?: string }>(
        'retrieve signature token',
        () =>
          apiAxios.get('/token', {
            headers: {
              Authorization: `Basic ${credentials}`,
              version: '2.5.0'
            }
          }),
        (error, operation) =>
          buildApiServiceError(error, {
            providerLabel: 'Mopinion',
            reason: 'mopinion_auth_error',
            operation
          })
      );

      let signatureToken = response.token;
      if (typeof signatureToken !== 'string' || !signatureToken) {
        throw createApiServiceError(
          'Mopinion did not return a signature token. Check your API keys.'
        );
      }

      return {
        output: {
          publicKey: ctx.input.publicKey,
          signatureToken
        }
      };
    },

    getProfile: async (ctx: {
      output: { publicKey: string; signatureToken: string };
      input: { publicKey: string; privateKey: string };
    }) => {
      let { MopinionClient } = await import('./lib/client');
      let client = new MopinionClient({
        publicKey: ctx.output.publicKey,
        signatureToken: ctx.output.signatureToken
      });

      let result = await client.getAccount();
      let account = result.data ?? result;

      return {
        profile: {
          name: account.name || undefined,
          id: account.name || undefined
        }
      };
    }
  });
