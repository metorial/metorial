import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { contactSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `List and search contacts in OnePageCRM. Supports filtering by status, lead source, tag, and text search. Results are paginated.`,
  instructions: [
    'Use the search parameter for full-text search across contact fields.',
    'Use statusId or tag filters to narrow down results.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search term to filter contacts'),
      statusId: z.string().optional().describe('Filter by contact status ID'),
      leadSourceId: z.string().optional().describe('Filter by lead source ID'),
      tag: z.string().optional().describe('Filter by tag'),
      letter: z.string().optional().describe('Filter by first letter of last name'),
      sortBy: z.string().optional().describe('Field to sort by'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order'),
      page: z.number().optional().describe('Page number (starts at 1)'),
      perPage: z.number().optional().describe('Results per page (max 100, default 10)')
    })
  )
  .output(
    z.object({
      contacts: z.array(contactSchema).describe('List of contacts'),
      totalCount: z.number().describe('Total number of matching contacts'),
      page: z.number().describe('Current page number'),
      perPage: z.number().describe('Results per page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      userId: ctx.auth.userId,
      token: ctx.auth.token
    });

    let result = await client.listContacts(ctx.input);

    return {
      output: result,
      message: `Found **${result.totalCount}** contacts (page ${result.page}, showing ${result.contacts.length}).`
    };
  })
  .build();
