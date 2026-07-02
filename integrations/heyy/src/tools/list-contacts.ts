import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let contactSchema = z.object({
  contactId: z.string().describe('Unique identifier of the contact'),
  firstName: z.string().nullable().optional().describe('First name of the contact'),
  lastName: z.string().nullable().optional().describe('Last name of the contact'),
  phoneNumber: z.string().nullable().optional().describe('Phone number of the contact'),
  email: z.string().nullable().optional().describe('Email address of the contact'),
  labels: z.array(z.string()).optional().describe('Labels assigned to the contact'),
  attributes: z
    .array(
      z.object({
        name: z.string(),
        value: z.string()
      })
    )
    .optional()
    .describe('Custom attributes of the contact'),
  createdAt: z.string().optional().describe('When the contact was created'),
  updatedAt: z.string().optional().describe('When the contact was last updated')
});

export let listContactsTool = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `List and search contacts in your Heyy business account. Supports pagination, sorting, and search filtering. Returns contact details including names, phone numbers, emails, labels, and custom attributes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.string().optional().describe('Page number for pagination'),
      pageSize: z.string().optional().describe('Number of contacts per page'),
      sortBy: z
        .enum(['firstName', 'lastName', 'phoneNumber', 'createdAt', 'updatedAt'])
        .optional()
        .describe('Field to sort by'),
      order: z.enum(['ASC', 'DESC']).optional().describe('Sort order'),
      search: z.string().optional().describe('Search query to filter contacts')
    })
  )
  .output(
    z.object({
      contacts: z.array(contactSchema).describe('List of contacts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listContacts({
      page: ctx.input.page,
      pageSize: ctx.input.pageSize,
      sortBy: ctx.input.sortBy,
      order: ctx.input.order,
      search: ctx.input.search
    });

    let contacts = (result?.contacts ?? result ?? []).map((c: any) => ({
      contactId: c.id,
      firstName: c.firstName ?? null,
      lastName: c.lastName ?? null,
      phoneNumber: c.phoneNumber ?? null,
      email: c.email ?? null,
      labels: c.labels,
      attributes: c.attributes,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt
    }));

    return {
      output: { contacts },
      message: `Found **${contacts.length}** contact(s).`
    };
  })
  .build();
