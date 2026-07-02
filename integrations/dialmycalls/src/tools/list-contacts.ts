import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `Retrieve contacts from your DialMyCalls account. Optionally filter by group to get contacts belonging to a specific contact group.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      groupId: z
        .string()
        .optional()
        .describe('Filter contacts by group ID. If omitted, returns all contacts.'),
      range: z.string().optional().describe('Pagination range, e.g. "records=201-300"')
    })
  )
  .output(
    z.object({
      contacts: z.array(
        z.object({
          contactId: z.string().optional(),
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          phone: z.string().optional(),
          extension: z.string().optional(),
          email: z.string().optional(),
          extraData: z.string().optional(),
          groups: z.string().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let rawContacts = ctx.input.groupId
      ? await client.listContactsByGroup(ctx.input.groupId, ctx.input.range)
      : await client.listContacts(ctx.input.range);

    let contacts = rawContacts.map(c => ({
      contactId: c.id,
      firstName: c.firstname,
      lastName: c.lastname,
      phone: c.phone,
      extension: c.extension,
      email: c.email,
      extraData: c.extra1,
      groups: c.groups,
      createdAt: c.created_at,
      updatedAt: c.updated_at
    }));

    return {
      output: { contacts },
      message: `Retrieved **${contacts.length}** contact(s)${ctx.input.groupId ? ` from group \`${ctx.input.groupId}\`` : ''}.`
    };
  })
  .build();
