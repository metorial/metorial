import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let apiClient = createAxios({
  baseURL: 'https://api.hotspotsystem.com/v2.0'
});

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
      token: z
        .string()
        .describe(
          'API key generated from the HotspotSystem Control Center (Tools & Settings > API Keys)'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let response = await apiClient.get('/me', {
        headers: {
          'sn-apikey': ctx.output.token
        }
      });

      return {
        profile: {
          id: String(response.data.userId ?? response.data.id ?? ''),
          name: response.data.operator ?? response.data.name ?? ''
        }
      };
    }
  });
