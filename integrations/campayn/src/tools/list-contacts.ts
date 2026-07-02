import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `Retrieve contacts belonging to a specific list. Optionally filter by a keyword that matches against names, emails, or companies.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      listId: z.string().describe('ID of the list to retrieve contacts from'),
      filter: z
        .string()
        .optional()
        .describe('Keyword to filter contacts by name, email, or company')
    })
  )
  .output(
    z.object({
      contacts: z.array(
        z.object({
          contactId: z.string().describe('Unique identifier for the contact'),
          email: z.string().describe('Email address of the contact'),
          firstName: z.string().nullable().describe('First name of the contact'),
          lastName: z.string().nullable().describe('Last name of the contact'),
          imageUrl: z.string().describe('Profile image URL')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let contacts = await client.getListContacts(ctx.input.listId, ctx.input.filter);

    let mapped = contacts.map(c => ({
      contactId: c.id,
      email: c.email,
      firstName: c.first_name,
      lastName: c.last_name,
      imageUrl: c.image_url
    }));

    let filterMsg = ctx.input.filter ? ` matching "${ctx.input.filter}"` : '';
    return {
      output: { contacts: mapped },
      message: `Found **${mapped.length}** contact(s) in list ${ctx.input.listId}${filterMsg}.`
    };
  })
  .build();
