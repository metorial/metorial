import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieve one or more contact records from ForceManager.
Fetch a single contact by ID, or list/search contacts with filtering.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactId: z.number().optional().describe('Specific contact ID to retrieve'),
      query: z.string().optional().describe('ForceManager query language filter'),
      firstName: z.string().optional().describe('Search by first name (LIKE match)'),
      lastName: z.string().optional().describe('Search by last name (LIKE match)'),
      email: z.string().optional().describe('Search by email (LIKE match)'),
      accountId: z.number().optional().describe('Filter contacts by account ID'),
      page: z.number().optional().describe('Page number (0-indexed)')
    })
  )
  .output(
    z.object({
      contacts: z.array(z.any()).describe('List of matching contact records'),
      totalCount: z.number().describe('Number of records returned'),
      nextPage: z.number().nullable().describe('Next page number, or null if no more pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    if (ctx.input.contactId) {
      let contact = await client.getContact(ctx.input.contactId);
      return {
        output: { contacts: [contact], totalCount: 1, nextPage: null },
        message: `Retrieved contact **${contact?.firstName || ''} ${contact?.lastName || ctx.input.contactId}**`
      };
    }

    let params: Record<string, any> = {};
    if (ctx.input.query) params.q = ctx.input.query;
    if (ctx.input.firstName) params.firstName = ctx.input.firstName;
    if (ctx.input.lastName) params.lastName = ctx.input.lastName;
    if (ctx.input.email) params.email = ctx.input.email;
    if (ctx.input.accountId) params.accountId = ctx.input.accountId;

    let result = await client.listContacts(params, ctx.input.page);

    return {
      output: {
        contacts: result.records,
        totalCount: result.entityCount,
        nextPage: result.nextPage
      },
      message: `Found **${result.entityCount}** contact(s)${result.nextPage !== null ? ` (more pages available)` : ''}`
    };
  })
  .build();
