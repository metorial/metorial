import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',

    name: 'Client Credentials',
    key: 'client_credentials',

    inputSchema: z.object({
      clientId: z.string().describe('Your GageList API client ID'),
      clientSecret: z.string().describe('Your GageList API client secret')
    }),

    getOutput: async ctx => {
      let axios = createAxios();

      let params = new URLSearchParams();
      params.append('grant_type', 'password');
      params.append('client_id', ctx.input.clientId);
      params.append('client_secret', ctx.input.clientSecret);

      let response = await axios.post('https://gagelist.net/api/token', params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return {
        output: {
          token: response.data.access_token
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string };
      input: { clientId: string; clientSecret: string };
    }) => {
      let axios = createAxios({
        baseURL: 'https://gagelist.net/GageList/api',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`,
          Accept: 'application/json'
        }
      });

      let response = await axios.get('/Account/Status');

      return {
        profile: {
          name: response.data.data?.AccountName ?? 'GageList Account'
        }
      };
    }
  });
