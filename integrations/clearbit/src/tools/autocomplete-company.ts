import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClearbitClient } from '../lib/client';
import { spec } from '../spec';

let suggestionSchema = z.object({
  name: z.string().describe('Company name'),
  domain: z.string().describe('Company domain'),
  logo: z.string().describe('Company logo URL')
});

export let autocompleteCompany = SlateTool.create(spec, {
  name: 'Autocomplete Company',
  key: 'autocomplete_company',
  description: `Get company name autocomplete suggestions as users type. Returns matching company names with their domains and logos. Useful for building search interfaces, forms, and company selection dropdowns.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Partial company name to autocomplete')
    })
  )
  .output(
    z.object({
      suggestions: z.array(suggestionSchema).describe('List of matching company suggestions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClearbitClient({ token: ctx.auth.token });

    let results = await client.autocomplete({ query: ctx.input.query });

    return {
      output: {
        suggestions: results.map(item => ({
          name: item.name,
          domain: item.domain,
          logo: item.logo
        }))
      },
      message: `Found **${results.length}** suggestions for "${ctx.input.query}".`
    };
  })
  .build();
