import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `Search and list contacts (clients, suppliers, or both) in your Elorus organization. Supports filtering by role, free-text search, date ranges, and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z
        .string()
        .optional()
        .describe('Free-text search across contact name, company, and VAT number.'),
      isClient: z.boolean().optional().describe('Filter for contacts marked as clients.'),
      isSupplier: z.boolean().optional().describe('Filter for contacts marked as suppliers.'),
      ordering: z
        .string()
        .optional()
        .describe(
          'Sort field. Prefix with "-" for descending. E.g. "display_name", "-created".'
        ),
      page: z.number().optional().describe('Page number for pagination (starts at 1).'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of results per page (max 250, default 100).'),
      modifiedAfter: z
        .string()
        .optional()
        .describe('Only return contacts modified after this date (ISO 8601 or YYYY-MM-DD).')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of matching contacts.'),
      contacts: z.array(z.any()).describe('Array of contact objects.'),
      hasMore: z.boolean().describe('Whether there are more pages of results.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.listContacts({
      search: ctx.input.search,
      isClient: ctx.input.isClient,
      isSupplier: ctx.input.isSupplier,
      ordering: ctx.input.ordering,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize,
      modifiedAfter: ctx.input.modifiedAfter
    });

    return {
      output: {
        totalCount: result.count,
        contacts: result.results,
        hasMore: result.next !== null
      },
      message: `Found **${result.count}** contact(s). Returned ${result.results.length} on this page.`
    };
  })
  .build();
