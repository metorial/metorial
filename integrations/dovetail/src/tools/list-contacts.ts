import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `List all research contacts (participants/customers) in the workspace, or retrieve a specific contact by ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactId: z
        .string()
        .optional()
        .describe('Retrieve a specific contact by ID. If omitted, lists all contacts.')
    })
  )
  .output(
    z.object({
      contacts: z.array(
        z.object({
          contactId: z.string(),
          name: z.string(),
          email: z.string().optional(),
          createdAt: z.string(),
          updatedAt: z.string()
        })
      ),
      total: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.contactId) {
      let contact = await client.getContact(ctx.input.contactId);
      return {
        output: {
          contacts: [
            {
              contactId: contact.id,
              name: contact.name,
              email: contact.email,
              createdAt: contact.created_at,
              updatedAt: contact.updated_at
            }
          ]
        },
        message: `Retrieved contact **${contact.name}**.`
      };
    }

    let result = await client.listContacts();
    let contacts = result.contacts.map(c => ({
      contactId: c.id,
      name: c.name,
      email: c.email,
      createdAt: c.created_at,
      updatedAt: c.updated_at
    }));

    return {
      output: {
        contacts,
        total: result.total
      },
      message: `Found **${result.total}** contacts.`
    };
  })
  .build();
