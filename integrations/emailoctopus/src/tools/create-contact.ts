import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Add a new contact to a list with an email address, optional custom field values, tags, and subscription status. If the list has double opt-in enabled, the contact will receive a confirmation email.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      listId: z.string().describe('ID of the list to add the contact to'),
      emailAddress: z.string().describe('Email address for the new contact'),
      fields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom field values as key-value pairs where keys are field tags'),
      tags: z.array(z.string()).optional().describe('Tags to assign to the contact'),
      status: z
        .enum(['SUBSCRIBED', 'UNSUBSCRIBED', 'PENDING'])
        .optional()
        .describe('Subscription status. Defaults based on list double opt-in settings.')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('Unique identifier of the created contact'),
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
    let contact = await client.createContact(ctx.input.listId, {
      emailAddress: ctx.input.emailAddress,
      fields: ctx.input.fields,
      tags: ctx.input.tags,
      status: ctx.input.status
    });

    return {
      output: contact,
      message: `Created contact **${contact.emailAddress}** with status ${contact.status}.`
    };
  })
  .build();
