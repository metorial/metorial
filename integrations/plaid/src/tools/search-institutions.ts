import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlaidClient } from '../lib/client';
import { spec } from '../spec';

let institutionSchema = z.object({
  institutionId: z.string().describe('Plaid institution identifier'),
  name: z.string().describe('Institution name'),
  products: z.array(z.string()).describe('Supported Plaid products'),
  countryCodes: z.array(z.string()).describe('Supported country codes'),
  oauth: z.boolean().optional().describe('Whether the institution supports OAuth'),
  url: z.string().nullable().optional().describe('Institution website URL'),
  primaryColor: z.string().nullable().optional().describe('Brand primary color hex code'),
  routingNumbers: z.array(z.string()).optional().describe('Known routing numbers')
});

export let searchInstitutionsTool = SlateTool.create(spec, {
  name: 'Search Institutions',
  key: 'search_institutions',
  description: `Search for financial institutions supported by Plaid. Filter by name, country, and required products. Returns institution metadata including supported products, OAuth support, and branding details. Only institutions supporting **all** specified products are returned.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search query (institution name)'),
      countryCodes: z
        .array(z.string())
        .default(['US'])
        .describe('ISO 3166-1 alpha-2 country codes to search in'),
      products: z
        .array(z.string())
        .optional()
        .describe(
          'Filter to institutions supporting all of these products (e.g. transactions, auth, identity)'
        )
    })
  )
  .output(
    z.object({
      institutions: z.array(institutionSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlaidClient({
      clientId: ctx.auth.clientId,
      secret: ctx.auth.secret,
      environment: ctx.config.environment
    });

    let result = await client.searchInstitutions(
      ctx.input.query,
      ctx.input.countryCodes,
      ctx.input.products
    );

    let institutions = (result.institutions || []).map((i: any) => ({
      institutionId: i.institution_id,
      name: i.name,
      products: i.products || [],
      countryCodes: i.country_codes || [],
      oauth: i.oauth,
      url: i.url ?? null,
      primaryColor: i.primary_color ?? null,
      routingNumbers: i.routing_numbers
    }));

    return {
      output: { institutions },
      message: `Found **${institutions.length}** institution(s) matching "${ctx.input.query}".`
    };
  })
  .build();
