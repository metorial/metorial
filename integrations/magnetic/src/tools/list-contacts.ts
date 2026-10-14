import { SlateTool } from 'slates';
import { z } from 'zod';
import { MagneticClient } from '../lib/client';
import { spec } from '../spec';

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description:
    'Retrieve contacts available to the connected Magnetic user, including their IDs and provider details. Use contact IDs to create opportunities or contact activity records.',
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      contacts: z.array(
        z.object({
          contactId: z.string().describe('ID to use when referring to this contact'),
          details: z
            .record(z.string(), z.unknown())
            .describe('Contact details returned by Magnetic')
        })
      ),
      totalCount: z.number().describe('Number of contacts returned by the API')
    })
  )
  .handleInvocation(async ctx => {
    let records = await new MagneticClient({ token: ctx.auth.token }).listContacts();
    let contacts = records.map(contact => ({
      contactId: String(contact.id),
      details: contact
    }));
    return {
      output: { contacts, totalCount: contacts.length },
      message: `Retrieved ${contacts.length} contact${contacts.length === 1 ? '' : 's'}.`
    };
  })
  .build();
