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
    name: 'API Token',
    key: 'api_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe('Terraform Cloud API token (User, Team, or Organization token)')
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
        baseURL: 'https://app.terraform.io/api/v2',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`,
          'Content-Type': 'application/vnd.api+json'
        }
      });

      try {
        let response = await axios.get('/account/details');
        let user = response.data?.data?.attributes;
        return {
          profile: {
            id: response.data?.data?.id,
            name: user?.username,
            email: user?.email,
            imageUrl: user?.['avatar-url']
          }
        };
      } catch {
        return {
          profile: {}
        };
      }
    }
  });
