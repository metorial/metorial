import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      baseUrl: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Client Credentials',
    key: 'client_credentials',

    inputSchema: z.object({
      clientId: z
        .string()
        .describe(
          'The client ID from your Airbyte application (User Settings > Applications).'
        ),
      clientSecret: z.string().describe('The client secret from your Airbyte application.'),
      baseUrl: z
        .string()
        .default('https://api.airbyte.com/v1')
        .describe(
          'Base URL for the Airbyte API. Use https://api.airbyte.com/v1 for Cloud or <YOUR_AIRBYTE_URL>/api/public/v1 for self-managed.'
        )
    }),

    getOutput: async ctx => {
      let http = createAxios({
        baseURL: ctx.input.baseUrl
      });

      let response = await http.post('/applications/token', {
        grant_type: 'client_credentials',
        client_id: ctx.input.clientId,
        client_secret: ctx.input.clientSecret
      });

      return {
        output: {
          token: response.data.access_token,
          baseUrl: ctx.input.baseUrl
        }
      };
    }
  });
