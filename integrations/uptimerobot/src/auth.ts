import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'UptimeRobot API key. Found under Integrations & API > API in your dashboard.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let axios = createAxios({
        baseURL: 'https://api.uptimerobot.com/v2'
      });

      let response = await axios.post('/getAccountDetails', {
        api_key: ctx.output.token,
        format: 'json'
      });

      let account = response.data.account;

      return {
        profile: {
          email: account.email,
          name: account.email
        }
      };
    }
  });
