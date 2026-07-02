import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let filterConditionSchema = z.object({
  field: z
    .string()
    .describe('Contact field name to filter on (e.g. firstName, email, phone, tag)'),
  operator: z.string().describe('Filter operator (e.g. eq, contains, starts_with)'),
  value: z.any().describe('Value to compare against')
});

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `Search and list contacts in the workspace with optional filtering. Supports AND/OR filter conditions on any contact field. Results are paginated with cursor-based navigation.`,
  instructions: [
    'Use the cursorId from a previous response to fetch the next page of results.',
    'Filters use AND/OR conditions with field, operator, and value.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      filters: z
        .object({
          and: z.array(filterConditionSchema).optional().describe('All conditions must match'),
          or: z.array(filterConditionSchema).optional().describe('Any condition must match')
        })
        .optional()
        .describe('Filter conditions for narrowing results'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of contacts to return (1-100, default: 10)'),
      cursorId: z
        .string()
        .optional()
        .describe('Cursor ID for pagination from a previous response')
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
            tags: z.array(z.string()).optional().describe('Contact tags'),
            status: z.string().optional().describe('Contact status'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .describe('List of contacts'),
      nextCursorId: z.string().optional().describe('Cursor ID for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listContacts(
      ctx.input.filters,
      ctx.input.limit,
      ctx.input.cursorId
    );
    let data = result?.data || result;
    let contactsList = Array.isArray(data) ? data : data?.contacts || data?.data || [];

    let contacts = contactsList.map((c: any) => ({
      contactId: String(c.id || ''),
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      phone: c.phone,
      tags: c.tags,
      status: c.status,
      createdAt: c.createdAt
    }));

    return {
      output: {
        contacts,
        nextCursorId: data?.cursorId || data?.nextCursorId
      },
      message: `Found **${contacts.length}** contact(s).`
    };
  })
  .build();
