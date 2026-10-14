import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchContacts = SlateTool.create(spec, {
  name: 'Search Contacts',
  key: 'search_contacts',
  description: `Search across all contacts in your Helpwise account by name, email, phone, or other attributes. Returns matching contacts with their full details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search term to match against contact fields'),
      limit: z
        .number()
        .positive()
        .refine(Number.isSafeInteger)
        .optional()
        .describe('Maximum number of results to return'),
      page: z
        .number()
        .positive()
        .refine(Number.isSafeInteger)
        .optional()
        .describe('Page number; converted to offset using limit (20 if omitted)'),
      offset: z
        .number()
        .nonnegative()
        .refine(Number.isSafeInteger)
        .optional()
        .describe('Number of contacts to skip; takes precedence over page')
    })
  )
  .output(
    z.object({
      nextPage: z.boolean().optional().describe('Whether more contacts are available'),
      contacts: z.array(z.record(z.string(), z.any())).describe('List of matching contacts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.searchContacts({
      query: ctx.input.query,
      limit: ctx.input.limit,
      page: ctx.input.page,
      offset: ctx.input.offset
    });

    let contacts = Array.isArray(result)
      ? result
      : (result.result ?? result.contacts ?? result.data?.contacts ?? result.data ?? []);

    return {
      output: { contacts, nextPage: result.nextPage },
      message: `Found ${contacts.length} contact(s) matching "${ctx.input.query}".`
    };
  })
  .build();
