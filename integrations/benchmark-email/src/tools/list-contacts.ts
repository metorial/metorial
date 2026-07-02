import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `List contacts in a specific contact list. Filter by status (active, unsubscribed) or search by email/name. Returns contact details including email, name, and custom fields.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      listId: z.string().describe('ID of the contact list to retrieve contacts from'),
      search: z.string().optional().describe('Search contacts by email or name'),
      status: z
        .enum(['active', 'unsubscribed'])
        .optional()
        .describe('Filter by contact status'),
      pageNumber: z.number().optional().describe('Page number for pagination (starts at 1)'),
      pageSize: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      contacts: z
        .array(
          z.object({
            contactId: z.string().describe('Unique contact ID'),
            email: z.string().describe('Contact email address'),
            firstName: z.string().describe('Contact first name'),
            lastName: z.string().describe('Contact last name'),
            middleName: z.string().describe('Contact middle name'),
            emailPermission: z.string().describe('Email permission status'),
            optinDate: z.string().describe('Date the contact opted in'),
            customFields: z
              .record(z.string(), z.string())
              .describe('Custom field values (Field1-Field24)')
          })
        )
        .describe('List of contacts'),
      totalCount: z.number().describe('Total number of matching contacts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let filterMap: Record<string, string> = {
      active: '0',
      unsubscribed: '2'
    };

    let result = await client.listContacts(ctx.input.listId, {
      searchFilter: ctx.input.search,
      filter: ctx.input.status ? filterMap[ctx.input.status] : undefined,
      pageNumber: ctx.input.pageNumber,
      pageSize: ctx.input.pageSize
    });

    let contacts = (result?.Data ?? []).map((c: any) => {
      let customFields: Record<string, string> = {};
      for (let i = 1; i <= 24; i++) {
        let val = c[`Field${i}`];
        if (val && String(val).trim()) {
          customFields[`field${i}`] = String(val);
        }
      }

      return {
        contactId: String(c.ID ?? ''),
        email: String(c.Email ?? ''),
        firstName: String(c.FirstName ?? ''),
        lastName: String(c.LastName ?? ''),
        middleName: String(c.MiddleName ?? ''),
        emailPermission: String(c.EmailPerm ?? ''),
        optinDate: String(c.OptinDate ?? ''),
        customFields
      };
    });

    return {
      output: {
        contacts,
        totalCount: Number(result?.Count ?? contacts.length)
      },
      message: `Found **${contacts.length}** contact(s) in list \`${ctx.input.listId}\`${ctx.input.search ? ` matching "${ctx.input.search}"` : ''}.`
    };
  })
  .build();
