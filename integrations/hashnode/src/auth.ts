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
    key: 'pat',

    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Hashnode Personal Access Token (PAT). Generate one at https://hashnode.com/settings/developer'
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
      let axiosInstance = createAxios({
        baseURL: 'https://gql.hashnode.com'
      });

      let response = await axiosInstance.post(
        '/',
        {
          query: `query Me {
          me {
            id
            username
            name
            email
            profilePicture
          }
        }`
        },
        {
          headers: {
            Authorization: ctx.output.token
          }
        }
      );

      let user = response.data?.data?.me;

      return {
        profile: {
          id: user?.id,
          email: user?.email,
          name: user?.name || user?.username,
          imageUrl: user?.profilePicture
        }
      };
    }
  });
