import { SlateTool } from 'slates';
import { z } from 'zod';
import { FirmaoClient } from '../lib/client';
import { spec } from '../spec';

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `Search and list contact persons from Firmao. Contacts are associated with customer records. Supports filtering by name, customer, and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      start: z.number().optional().describe('Offset for pagination (default 0)'),
      limit: z.number().optional().describe('Maximum number of results'),
      sort: z.string().optional().describe('Field to sort by'),
      dir: z.enum(['ASC', 'DESC']).optional().describe('Sort direction'),
      nameContains: z
        .string()
        .optional()
        .describe('Filter by first or last name containing this value'),
      customerId: z.number().optional().describe('Filter contacts by customer ID')
    })
  )
  .output(
    z.object({
      contacts: z.array(
        z.object({
          contactId: z.number(),
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          label: z.string().optional(),
          position: z.string().optional(),
          emails: z.array(z.string()).optional(),
          phones: z.array(z.string()).optional(),
          customerId: z.number().optional(),
          customerName: z.string().optional(),
          creationDate: z.string().optional()
        })
      ),
      totalSize: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FirmaoClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let filters: Record<string, string> = {};
    if (ctx.input.nameContains) filters['firstName(contains)'] = ctx.input.nameContains;
    if (ctx.input.customerId !== undefined)
      filters['customer(eq)'] = String(ctx.input.customerId);

    let result = await client.list('contacts', {
      start: ctx.input.start,
      limit: ctx.input.limit,
      sort: ctx.input.sort,
      dir: ctx.input.dir,
      filters
    });

    let contacts = result.data.map((c: any) => ({
      contactId: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      label: c.label,
      position: c.position,
      emails: c.emails,
      phones: c.phones,
      customerId: typeof c.customer === 'object' ? c.customer?.id : c.customer,
      customerName: typeof c.customer === 'object' ? c.customer?.name : undefined,
      creationDate: c.creationDate
    }));

    return {
      output: { contacts, totalSize: result.totalSize },
      message: `Found **${contacts.length}** contact(s) (total: ${result.totalSize}).`
    };
  })
  .build();
