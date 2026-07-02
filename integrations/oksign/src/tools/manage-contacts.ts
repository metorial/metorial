import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let contactSchema = z.object({
  name: z.string().describe('Contact full name'),
  email: z.string().describe('Contact email address'),
  mobile: z.string().optional().describe('Contact mobile number in E.164 format'),
  actingAs: z.string().optional().describe('Role or capacity of the contact'),
  group: z.string().optional().describe('Group assignment for organizing contacts')
});

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `Retrieve all contacts from your OKSign account. Returns the full contact list with names, emails, mobile numbers, roles, and groups.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      contacts: z
        .array(
          z.object({
            name: z.string().describe('Contact name'),
            email: z.string().describe('Contact email'),
            mobile: z.string().optional().describe('Contact mobile'),
            actingAs: z.string().optional().describe('Contact role'),
            group: z.string().optional().describe('Contact group')
          })
        )
        .describe('List of contacts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let contacts = await client.retrieveContacts();

    let mapped = Array.isArray(contacts)
      ? contacts.map((c: any) => ({
          name: c.name,
          email: c.email,
          mobile: c.mobile,
          actingAs: c.actingas,
          group: c.group
        }))
      : [];

    return {
      output: { contacts: mapped },
      message: `Retrieved **${mapped.length}** contact(s).`
    };
  })
  .build();

export let upsertContacts = SlateTool.create(spec, {
  name: 'Upsert Contacts',
  key: 'upsert_contacts',
  description: `Add or update contacts in your OKSign account. Contacts are uniquely identified by the combination of email and name. If a contact with the same email and name already exists, it will be updated; otherwise, a new contact is created.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contacts: z.array(contactSchema).describe('Contacts to add or update')
    })
  )
  .output(
    z.object({
      saved: z.boolean().describe('Whether the contacts were saved successfully'),
      count: z.number().describe('Number of contacts processed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let contacts = ctx.input.contacts.map(c => ({
      name: c.name,
      email: c.email,
      mobile: c.mobile,
      actingas: c.actingAs,
      group: c.group
    }));

    await client.uploadContacts(contacts);

    return {
      output: { saved: true, count: contacts.length },
      message: `Successfully saved **${contacts.length}** contact(s).`
    };
  })
  .build();

export let removeContact = SlateTool.create(spec, {
  name: 'Remove Contact',
  key: 'remove_contact',
  description: `Remove a contact from your OKSign account by their contact ID.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact to remove')
    })
  )
  .output(
    z.object({
      removed: z.boolean().describe('Whether the contact was removed successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.removeContact(ctx.input.contactId);

    return {
      output: { removed: true },
      message: `Contact \`${ctx.input.contactId}\` removed successfully.`
    };
  })
  .build();
