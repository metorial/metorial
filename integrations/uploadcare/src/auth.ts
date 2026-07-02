import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      publicKey: z.string(),
      secretKey: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Keys',
    key: 'api_keys',

    inputSchema: z.object({
      publicKey: z.string().describe('Uploadcare Public Key from your project settings'),
      secretKey: z.string().describe('Uploadcare Secret Key from your project settings')
    }),

    getOutput: async ctx => {
      return {
        output: {
          publicKey: ctx.input.publicKey,
          secretKey: ctx.input.secretKey
        }
      };
    },

    getProfile: async (ctx: {
      output: { publicKey: string; secretKey: string };
      input: { publicKey: string; secretKey: string };
    }) => {
      let client = createAxios({
        baseURL: 'https://api.uploadcare.com/'
      });

      let response = await client.get('/project/', {
        headers: {
          Accept: 'application/vnd.uploadcare-v0.7+json',
          Authorization: `Uploadcare.Simple ${ctx.output.publicKey}:${ctx.output.secretKey}`
        }
      });

      return {
        profile: {
          id: ctx.output.publicKey,
          name: response.data.name
        }
      };
    }
  });
