import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      webApiKey: z.string(),
      appKey: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Keys',
    key: 'api_keys',

    inputSchema: z.object({
      webApiKey: z
        .string()
        .describe(
          'Your FinerWorks web API key, found at https://finerworks.com/MyAccount/MyWebApi.aspx'
        ),
      appKey: z
        .string()
        .describe(
          'Your FinerWorks application key. Can be toggled between test and live modes in your account settings.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          webApiKey: ctx.input.webApiKey,
          appKey: ctx.input.appKey
        }
      };
    },

    getProfile: async (ctx: {
      output: { webApiKey: string; appKey: string };
      input: { webApiKey: string; appKey: string };
    }) => {
      let axios = createAxios({
        baseURL: 'https://api.finerworks.com',
        headers: {
          'Content-Type': 'application/json',
          web_api_key: ctx.output.webApiKey,
          app_key: ctx.output.appKey
        }
      });

      let response = await axios.get('/v3/test_my_credentials');
      let data = response.data;

      if (!data.status?.success) {
        throw new Error(data.status?.message || 'Failed to verify credentials');
      }

      let account = data.user_account;
      return {
        profile: {
          id: String(account?.account_id ?? ''),
          email: account?.account_email ?? '',
          name: account?.account_username ?? ''
        }
      };
    }
  });
