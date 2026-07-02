import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieve a specific contact from a list by contact ID or MD5 hash of their lowercase email address.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      listId: z.string().describe('ID of the list the contact belongs to'),
      contactId: z.string().describe('Contact ID or MD5 hash of the lowercase email address')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('Unique identifier of the contact'),
      emailAddress: z.string().describe('Email address of the contact'),
      fields: z.record(z.string(), z.string()).describe('Custom field values'),
      tags: z.array(z.string()).describe('Tags assigned to the contact'),
      status: z.string().describe('Subscription status'),
      createdAt: z.string().describe('ISO 8601 creation timestamp'),
      lastUpdatedAt: z.string().describe('ISO 8601 last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let contact = await client.getContact(ctx.input.listId, ctx.input.contactId);

    return {
      output: contact,
      message: `Retrieved contact **${contact.emailAddress}** (status: ${contact.status}).`
    };
  })
  .build();
