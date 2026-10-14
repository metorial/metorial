import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchContactsTool = SlateTool.create(spec, {
  name: 'Search Contacts',
  key: 'search_contacts',
  description: `Search contacts in AccuLynx by name, company, contact type, and creation date range. Returns paginated results with sorting. When dates are omitted, searches contacts created from 1970 through the current time.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search query text'),
      pageSize: z
        .number()
        .min(1)
        .max(25)
        .refine(Number.isSafeInteger, 'Must be a safe integer')
        .optional()
        .describe('Number of items per page, up to 25'),
      pageStartIndex: z
        .number()
        .min(0)
        .refine(Number.isSafeInteger, 'Must be a safe integer')
        .optional()
        .describe('Zero-based page index to return'),
      startDate: z
        .string()
        .optional()
        .describe(
          'Creation date range start in ISO 8601 format; defaults to 1970-01-01T00:00:00Z'
        ),
      endDate: z
        .string()
        .optional()
        .describe('Creation date range end in ISO 8601 format; defaults to the current time'),
      contactTypes: z.array(z.string()).optional().describe('Contact type names to filter on'),
      sortColumn: z
        .enum([
          'CreatedDate',
          'CompanyName',
          'ContactType',
          'firstName',
          'lastName',
          'LifeTimeValue'
        ])
        .optional()
        .describe('Field to sort on; defaults to CreatedDate'),
      sortDirection: z
        .enum(['Ascending', 'Descending'])
        .optional()
        .describe('Sort direction; defaults to Ascending')
    })
  )
  .output(
    z.object({
      contacts: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of matching contact objects'),
      totalCount: z.number().optional().describe('Total number of matching contacts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.searchContacts({
      query: ctx.input.query,
      pageSize: ctx.input.pageSize,
      pageStartIndex: ctx.input.pageStartIndex,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      contactTypes: ctx.input.contactTypes,
      sortColumn: ctx.input.sortColumn,
      sortDirection: ctx.input.sortDirection
    });

    let contacts = Array.isArray(result)
      ? result
      : (result?.items ?? result?.data ?? [result]);
    let totalCount = result?.count ?? result?.totalCount ?? result?.total ?? contacts.length;

    return {
      output: { contacts, totalCount },
      message: `Found **${contacts.length}** contacts matching query "${ctx.input.query ?? ''}".`
    };
  })
  .build();
