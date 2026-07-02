import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { stringOrUndefined, timestampOrUndefined } from '../lib/output';
import { spec } from '../spec';

let filterSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    field: z
      .string()
      .optional()
      .describe(
        'Field to filter on (e.g., "email", "name", "role", "created_at", custom_attributes.*)'
      ),
    operator: z
      .enum([
        '=',
        '!=',
        '>',
        '<',
        '~',
        '!~',
        'IN',
        'NIN',
        'starts_with',
        'ends_with',
        'contains',
        'NOT_contains'
      ])
      .optional()
      .describe('Comparison operator'),
    value: z.any().optional().describe('Value to compare against'),
    AND: z
      .array(z.lazy(() => filterSchema))
      .optional()
      .describe('Array of filters combined with AND'),
    OR: z
      .array(z.lazy(() => filterSchema))
      .optional()
      .describe('Array of filters combined with OR')
  })
);

export let searchContacts = SlateTool.create(spec, {
  name: 'Search Contacts',
  key: 'search_contacts',
  description: `Search for contacts using Intercom's query language. Supports filtering by any contact field including custom attributes. Use nested AND/OR operators for complex queries.
Returns paginated results with cursor-based pagination.`,
  instructions: [
    'Use "field", "operator", and "value" for simple filters.',
    'Use "AND" or "OR" arrays to combine multiple filters.',
    'Common fields: "email", "name", "role", "phone", "created_at", "updated_at", "external_id".',
    'For custom attributes, use "custom_attributes.attribute_name".'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: filterSchema.describe('Search query using Intercom filter syntax'),
      perPage: z.number().optional().describe('Results per page (default 50, max 150)'),
      paginationCursor: z
        .string()
        .optional()
        .describe('Cursor for fetching the next page of results')
    })
  )
  .output(
    z.object({
      contacts: z
        .array(
          z.object({
            contactId: z.string().describe('Intercom contact ID'),
            role: z.string().optional().describe('Contact role'),
            email: z.string().optional().describe('Contact email'),
            name: z.string().optional().describe('Contact name'),
            phone: z.string().optional().describe('Contact phone'),
            externalId: z.string().optional().describe('External ID'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            updatedAt: z.string().optional().describe('Last update timestamp')
          })
        )
        .describe('Matching contacts'),
      totalCount: z.number().optional().describe('Total number of matching contacts'),
      hasMore: z.boolean().describe('Whether more results are available'),
      nextCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });

    let result = await client.searchContacts(
      ctx.input.query,
      ctx.input.paginationCursor,
      ctx.input.perPage
    );

    let contacts = (result.data || []).map((c: any) => ({
      contactId: String(c.id),
      role: stringOrUndefined(c.role),
      email: stringOrUndefined(c.email),
      name: stringOrUndefined(c.name),
      phone: stringOrUndefined(c.phone),
      externalId: stringOrUndefined(c.external_id),
      createdAt: timestampOrUndefined(c.created_at),
      updatedAt: timestampOrUndefined(c.updated_at)
    }));

    return {
      output: {
        contacts,
        totalCount: result.total_count,
        hasMore: !!result.pages?.next,
        nextCursor: result.pages?.next?.starting_after
      },
      message: `Found **${result.total_count ?? contacts.length}** contacts (showing ${contacts.length})`
    };
  })
  .build();
