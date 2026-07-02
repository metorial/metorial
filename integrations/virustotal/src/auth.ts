import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let http = createAxios({
  baseURL: 'https://www.virustotal.com/api/v3'
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
          'Your VirusTotal API key. Found in your personal settings at virustotal.com.'
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
      let response = await http.get('/users/me', {
        headers: {
          'x-apikey': ctx.output.token
        }
      });
      let user = response.data?.data?.attributes;
      return {
        profile: {
          id: response.data?.data?.id,
          name: user?.user ?? user?.first_name,
          email: user?.email
        }
      };
    }
  });
