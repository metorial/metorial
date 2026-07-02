import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      serverUrl: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Organization API Key',
    key: 'organization_api_key',

    inputSchema: z.object({
      clientId: z.string().describe('Organization client ID (format: organization.xxxxx)'),
      clientSecret: z.string().describe('Organization client secret'),
      identityUrl: z
        .enum(['https://identity.bitwarden.com', 'https://identity.bitwarden.eu'])
        .default('https://identity.bitwarden.com')
        .describe('Bitwarden Identity server URL')
    }),

    getOutput: async ctx => {
      let http = createAxios({
        baseURL: ctx.input.identityUrl
      });

      let params = new URLSearchParams();
      params.append('grant_type', 'client_credentials');
      params.append('scope', 'api.organization');
      params.append('client_id', ctx.input.clientId);
      params.append('client_secret', ctx.input.clientSecret);

      let response = await http.post('/connect/token', params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      let identityUrl = ctx.input.identityUrl;
      let serverUrl =
        identityUrl === 'https://identity.bitwarden.eu'
          ? 'https://api.bitwarden.eu'
          : 'https://api.bitwarden.com';

      return {
        output: {
          token: response.data.access_token,
          serverUrl
        }
      };
    }
  });
