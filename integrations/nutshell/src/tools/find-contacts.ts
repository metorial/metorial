import { SlateTool } from 'slates';
import { z } from 'zod';
import { NutshellClient } from '../lib/client';
import { spec } from '../spec';

export let findContacts = SlateTool.create(spec, {
  name: 'Find Contacts',
  key: 'find_contacts',
  description: `Search and list contacts in Nutshell CRM. Supports pagination, sorting, and filtering. Use this to find contacts by various criteria or to list all contacts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.record(z.string(), z.any()).optional().describe('Filter criteria for contacts'),
      orderBy: z.string().optional().describe('Field to sort by (default: "name")'),
      orderDirection: z.enum(['ASC', 'DESC']).optional().describe('Sort direction'),
      limit: z.number().optional().describe('Number of results per page (default: 50)'),
      page: z.number().optional().describe('Page number (default: 1)'),
      stubResponses: z
        .boolean()
        .optional()
        .describe('Return lightweight stub responses for faster performance')
    })
  )
  .output(
    z.object({
      contacts: z
        .array(
          z.object({
            contactId: z.number().describe('ID of the contact'),
            name: z.string().describe('Full name'),
            emails: z.array(z.any()).optional().describe('Email addresses'),
            phones: z.array(z.any()).optional().describe('Phone numbers'),
            entityType: z.string().optional().describe('Entity type')
          })
        )
        .describe('List of contacts matching the criteria'),
      count: z.number().describe('Number of contacts returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NutshellClient({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let results = await client.findContacts({
      query: ctx.input.query,
      orderBy: ctx.input.orderBy,
      orderDirection: ctx.input.orderDirection,
      limit: ctx.input.limit,
      page: ctx.input.page,
      stubResponses: ctx.input.stubResponses
    });

    let contacts = results.map((c: any) => ({
      contactId: c.id,
      name: c.name,
      emails: c.email || c.emails,
      phones: c.phone || c.phones,
      entityType: c.entityType
    }));

    return {
      output: {
        contacts,
        count: contacts.length
      },
      message: `Found **${contacts.length}** contact(s).`
    };
  })
  .build();
