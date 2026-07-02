import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      brand: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key & Brand',
    key: 'api_key_brand',

    inputSchema: z.object({
      token: z
        .string()
        .describe('Your Agiled API key. Found under Profile → API Settings tab.'),
      brand: z
        .string()
        .describe(
          'Your Agiled brand/domain name (e.g. "my-company"). Found in the browser address bar or under Profile → Brands.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          brand: ctx.input.brand
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; brand: string };
      input: { token: string; brand: string };
    }) => {
      let client = createAxios({
        baseURL: 'https://my.agiled.app/api/v1',
        headers: {
          Accept: 'application/json',
          Brand: ctx.output.brand
        }
      });

      let response = await client.get(`/users?api_token=${ctx.output.token}`);
      let users = response.data?.data;
      let currentUser = Array.isArray(users) && users.length > 0 ? users[0] : null;

      return {
        profile: {
          id: currentUser?.id?.toString(),
          name: currentUser?.name,
          email: currentUser?.email,
          imageUrl: currentUser?.image_url
        }
      };
    }
  });
