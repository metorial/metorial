import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description:
    'Finds a SuiteDash CRM contact by UID or email address. Returns the provider response with the contact record, custom fields, and company associations.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      identifier: z
        .string()
        .min(1)
        .describe('Contact UID from List Contacts, or its email address')
    })
  )
  .output(
    z.object({
      contact: z
        .record(z.string(), z.unknown())
        .describe('Provider response containing the contact in its data field')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let contact = await client.getContact(ctx.input.identifier);
    return {
      output: { contact },
      message: `Retrieved contact **${ctx.input.identifier}**.`
    };
  })
  .build();
