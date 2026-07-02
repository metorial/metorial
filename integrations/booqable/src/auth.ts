import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      companySlug: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Access Token',
    key: 'access_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Your Booqable API access token. Create one at {company_slug}.booqable.com/employees/current under Authentication Methods.'
        ),
      companySlug: z
        .string()
        .describe('Your Booqable company slug (e.g. "mycompany" for mycompany.booqable.com)')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          companySlug: ctx.input.companySlug
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; companySlug: string };
      input: { token: string; companySlug: string };
    }) => {
      let axios = createAxios({
        baseURL: `https://${ctx.output.companySlug}.booqable.com/api/4`,
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let response = await axios.get('/employees/current');
      let employee = response.data?.data?.attributes || response.data?.data || {};

      return {
        profile: {
          id: response.data?.data?.id,
          name: employee.name,
          email: employee.email
        }
      };
    }
  });
