import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description:
    'Retrieve a Rentman contact and optionally its contact persons. Call list_contacts to discover contact IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      contactId: z.number().describe('Contact ID from list_contacts.'),
      includeContactPersons: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include the first page of linked contact persons.')
    })
  )
  .output(
    z.object({
      contactId: z.number(),
      contact: z.record(z.string(), z.any()),
      contactPersons: z.array(z.record(z.string(), z.any())).optional(),
      contactPersonsNextPageUrl: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let result = await client.get('contacts', ctx.input.contactId);
    let persons = ctx.input.includeContactPersons
      ? await client.listNested('contacts', ctx.input.contactId, 'contactpersons')
      : undefined;
    return {
      output: {
        contactId: result.data.id,
        contact: result.data,
        contactPersons: persons?.data,
        contactPersonsNextPageUrl: persons?.next_page_url
      },
      message: `Retrieved contact **${result.data.name || result.data.id}**.`
    };
  })
  .build();
