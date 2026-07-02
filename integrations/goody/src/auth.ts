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
      token: z.string().describe('Goody API key (Automation API or Commerce API key)')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let axios = createAxios();
      let response = await axios.get('https://api.ongoody.com/v1/me', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });
      let data = response.data;
      return {
        profile: {
          id: data.id,
          email: data.email,
          name:
            data.first_name && data.last_name
              ? `${data.first_name} ${data.last_name}`
              : data.email
        }
      };
    }
  });
