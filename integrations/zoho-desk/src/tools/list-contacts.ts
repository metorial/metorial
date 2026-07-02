import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `List customer contacts with optional sorting and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sortBy: z
        .string()
        .optional()
        .describe('Field to sort by (e.g., firstName, lastName, createdTime)'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order'),
      from: z.number().optional().describe('Starting index for pagination'),
      limit: z.number().optional().describe('Number of contacts to return (max 100)')
    })
  )
  .output(
    z.object({
      contacts: z
        .array(
          z.object({
            contactId: z.string().describe('Contact ID'),
            firstName: z.string().optional().describe('First name'),
            lastName: z.string().optional().describe('Last name'),
            email: z.string().optional().describe('Email address'),
            phone: z.string().optional().describe('Phone number'),
            accountId: z.string().optional().describe('Associated account ID')
          })
        )
        .describe('List of contacts')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.listContacts({
      sortBy: ctx.input.sortBy,
      sortOrder: ctx.input.sortOrder,
      from: ctx.input.from,
      limit: ctx.input.limit
    });

    let data = Array.isArray(result) ? result : result?.data || [];

    let contacts = data.map((c: any) => ({
      contactId: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      phone: c.phone,
      accountId: c.accountId
    }));

    return {
      output: { contacts },
      message: `Found **${contacts.length}** contact(s)`
    };
  })
  .build();
