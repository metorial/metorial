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
          'Rootly API key (starts with rootly_). Generate from Organization Settings > API Keys.'
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
      let axiosInstance = createAxios({
        baseURL: 'https://api.rootly.com/v1',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`,
          'Content-Type': 'application/vnd.api+json'
        }
      });

      let response = await axiosInstance.get('/users/me');
      let user = response.data?.data?.attributes;

      return {
        profile: {
          id: response.data?.data?.id,
          email: user?.email,
          name: user?.full_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim()
        }
      };
    }
  });
