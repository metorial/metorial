import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      username: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',

    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      username: z.string().describe('Your Cults3D username'),
      token: z.string().describe('API key generated from https://cults3d.com/en/api/keys')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          username: ctx.input.username
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; username: string };
      input: { username: string; token: string };
    }) => {
      let axios = createAxios({
        baseURL: 'https://cults3d.com'
      });

      let basicToken = Buffer.from(`${ctx.output.username}:${ctx.output.token}`).toString(
        'base64'
      );

      let response = await axios.post(
        '/graphql',
        {
          query: `{ myself { user { nick imageUrl } } }`
        },
        {
          headers: {
            Authorization: `Basic ${basicToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      let user = response.data?.data?.myself?.user;

      return {
        profile: {
          id: user?.nick,
          name: user?.nick,
          imageUrl: user?.imageUrl
        }
      };
    }
  });
