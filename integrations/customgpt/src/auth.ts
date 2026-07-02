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
      apiKey: z.string().describe('CustomGPT API key')
    }),
    getOutput: async (ctx: { input: { apiKey: string } }) => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let axiosInstance = createAxios({
        baseURL: 'https://app.customgpt.ai/api/v1',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`,
          Accept: 'application/json'
        }
      });

      let response = await axiosInstance.get('/user');
      let user = response.data?.data;

      return {
        profile: {
          id: user?.id ? String(user.id) : undefined,
          email: user?.email,
          name: user?.name
        }
      };
    }
  });
