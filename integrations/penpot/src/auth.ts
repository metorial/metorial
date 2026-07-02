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
    name: 'Personal Access Token',
    key: 'personal_access_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Personal Access Token generated from Your Account > Access Tokens in Penpot'
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
      let axios = createAxios({
        baseURL: 'https://design.penpot.app'
      });

      let response = await axios.get('/api/main/methods/get-profile', {
        headers: {
          Authorization: `Token ${ctx.output.token}`,
          Accept: 'application/json'
        }
      });

      let data = response.data;

      return {
        profile: {
          id: data.id,
          email: data.email,
          name: data.fullname,
          imageUrl: data.photoId ? undefined : undefined
        }
      };
    }
  });
