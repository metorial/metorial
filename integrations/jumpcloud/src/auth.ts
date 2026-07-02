import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('JumpCloud API key or OAuth access token')
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
          'JumpCloud Admin API Key (starts with jca_). Found in Admin Portal under your account name > My API Key.'
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
        baseURL: 'https://console.jumpcloud.com/api'
      });

      let response = await axios.get('/organizationentitlements', {
        headers: {
          'x-api-key': ctx.output.token,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }
      });

      return {
        profile: {
          id: response.data?.entitlement?.id,
          name: response.data?.entitlement?.displayName ?? 'JumpCloud Organization'
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Service Account (Client Credentials)',
    key: 'service_account',
    inputSchema: z.object({
      clientId: z.string().describe('Service Account Client ID'),
      clientSecret: z.string().describe('Service Account Client Secret')
    }),
    getOutput: async ctx => {
      let credentials = btoa(`${ctx.input.clientId}:${ctx.input.clientSecret}`);

      let axios = createAxios();

      let response = await axios.post(
        'https://oauth.id.jumpcloud.com/oauth2/token',
        'grant_type=client_credentials&scope=',
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json'
          }
        }
      );

      return {
        output: {
          token: response.data.access_token
        }
      };
    }
  });
