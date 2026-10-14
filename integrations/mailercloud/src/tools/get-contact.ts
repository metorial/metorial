import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description:
    'Retrieve a contact by ID, including its standard and custom fields. Use search_contacts to discover contact IDs in a list.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      contactId: z
        .string()
        .min(1)
        .describe('Contact ID returned by search_contacts or create_contact')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the contact'),
      contact: z.record(z.string(), z.unknown()).describe('Contact details')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).getContact(ctx.input.contactId);
    return {
      output: { contactId: ctx.input.contactId, contact: result?.data ?? result },
      message: `Retrieved contact ${ctx.input.contactId}.`
    };
  })
  .build();
