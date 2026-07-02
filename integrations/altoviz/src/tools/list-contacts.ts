import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let contactSchema = z.object({
  contactId: z.number().describe('Altoviz contact ID'),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  cellPhone: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  internalId: z.string().nullable().optional()
});

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `List contacts from your Altoviz account with pagination support.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageIndex: z.number().optional().describe('Page number (starts at 1)'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of results per page (1-100, default 10)')
    })
  )
  .output(
    z.object({
      contacts: z.array(contactSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let contacts = await client.listContacts({
      pageIndex: ctx.input.pageIndex,
      pageSize: ctx.input.pageSize
    });

    let mapped = contacts.map((c: any) => ({
      contactId: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      phone: c.phone,
      cellPhone: c.cellPhone,
      title: c.title,
      internalId: c.internalId
    }));

    return {
      output: { contacts: mapped },
      message: `Found **${mapped.length}** contact(s).`
    };
  })
  .build();
