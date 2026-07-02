import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { applyPdfmonkeyApiErrorInterceptor } from './lib/errors';

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
          'Your PDFMonkey API Secret Key, available on the API Key page in the PDFMonkey dashboard.'
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
        baseURL: 'https://api.pdfmonkey.io/api/v1',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });
      applyPdfmonkeyApiErrorInterceptor(axiosInstance);

      let response = await axiosInstance.get('/current_user');
      let user = response.data.current_user;

      return {
        profile: {
          id: user.id,
          email: user.email,
          name: user.desired_name
        }
      };
    }
  });
