import { SlateTool } from 'slates';
import { z } from 'zod';
import { FindymailClient } from '../lib/client';
import { spec } from '../spec';

export let listContacts = SlateTool.create(spec, {
  name: 'List Saved Contacts',
  key: 'list_contacts',
  description:
    'Retrieve saved contacts from a Findymail contact list or from all contacts. Call get_contact_lists to discover list IDs before selecting a list.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      listId: z
        .string()
        .regex(/^\d+$/)
        .optional()
        .describe('List ID from get_contact_lists. Omit or use "0" for all saved contacts.')
    })
  )
  .output(
    z.object({
      listId: z.string().describe('Selected list ID, or "0" for all contacts.'),
      contacts: z
        .array(
          z.object({
            contactId: z.string().describe('Saved contact ID.'),
            name: z.string().optional().describe('Contact name.'),
            email: z.string().optional().describe('Contact email address.'),
            linkedinUrl: z.string().optional().describe('LinkedIn profile URL.'),
            company: z.string().optional().describe('Company name.'),
            jobTitle: z.string().optional().describe('Contact job title.')
          })
        )
        .describe('Saved contacts returned by Findymail.'),
      recordsTotal: z.number().describe('Total contacts reported by Findymail.'),
      recordsFiltered: z.number().describe('Matching contacts reported by Findymail.'),
      returnedCount: z.number().describe('Number of contacts included in this response.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FindymailClient({ token: ctx.auth.token });
    let listId = ctx.input.listId ?? '0';
    let result = await client.listContacts({ listId });
    let contacts = result.data.map(contact => ({
      contactId: contact.id.toString(),
      name: contact.name ?? undefined,
      email: contact.email ?? undefined,
      linkedinUrl: contact.linkedin_url ?? undefined,
      company: contact.company ?? undefined,
      jobTitle: contact.job_title ?? undefined
    }));
    return {
      output: {
        listId,
        contacts,
        recordsTotal: result.recordsTotal,
        recordsFiltered: result.recordsFiltered,
        returnedCount: contacts.length
      },
      message: `Retrieved **${contacts.length}** saved contact(s)${listId !== '0' ? ` from list ${listId}` : ''}.`
    };
  })
  .build();
