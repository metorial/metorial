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
      token: z.string().describe('Your API-Sports API key from the dashboard')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let http = createAxios({
        baseURL: 'https://v3.football.api-sports.io',
        headers: {
          'x-apisports-key': ctx.output.token
        }
      });

      let response = await http.get('/status');
      let account = response.data?.response?.account;
      let subscription = response.data?.response?.subscription;

      return {
        profile: {
          name:
            account?.firstname && account?.lastname
              ? `${account.firstname} ${account.lastname}`
              : account?.email,
          email: account?.email,
          plan: subscription?.plan
        }
      };
    }
  });
