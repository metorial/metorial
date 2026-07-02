import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let axios = createAxios({
  baseURL: 'https://rest.clicksend.com/v3'
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      username: z.string(),
      token: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',

    name: 'API Credentials',
    key: 'api_credentials',

    inputSchema: z.object({
      username: z.string().describe('Your ClickSend API username'),
      apiKey: z
        .string()
        .describe('Your ClickSend API key (found under the key icon in the dashboard)')
    }),

    getOutput: async ctx => {
      return {
        output: {
          username: ctx.input.username,
          token: ctx.input.apiKey
        }
      };
    },

    getProfile: async (ctx: {
      output: { username: string; token: string };
      input: { username: string; apiKey: string };
    }) => {
      let encoded = Buffer.from(`${ctx.output.username}:${ctx.output.token}`).toString(
        'base64'
      );
      let response = await axios.get('/account', {
        headers: {
          Authorization: `Basic ${encoded}`
        }
      });

      let account = response.data.data;

      return {
        profile: {
          id: account.user_id?.toString(),
          email: account.user_email,
          name: [account.first_name, account.last_name].filter(Boolean).join(' ') || undefined
        }
      };
    }
  });
