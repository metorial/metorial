import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client, normalizeCompanySlug, requireValue } from './lib/client';
import { flattenSingleResource } from './lib/helpers';

export let auth = SlateAuth.create()
  .output(z.object({ token: z.string(), companySlug: z.string() }))
  .addTokenAuth({
    type: 'auth.token',
    name: 'Access Token',
    key: 'access_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Your Booqable API access token. Create one in your account profile under Authentication Methods.'
        ),
      companySlug: z
        .string()
        .describe(
          'Your Booqable company slug (for example, "mycompany" in mycompany.booqable.com)'
        )
    }),
    getOutput: async ctx => ({
      output: {
        token: requireValue(ctx.input.token, 'Access token'),
        companySlug: normalizeCompanySlug(ctx.input.companySlug)
      }
    }),
    getProfile: async (ctx: { output: { token: string; companySlug: string } }) => {
      let response = await new Client(ctx.output).getCompany();
      let company = flattenSingleResource(response);
      return { profile: { id: company.resourceId, name: company.name, email: company.email } };
    }
  });
