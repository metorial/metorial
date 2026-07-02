import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Update an existing contact's email address, custom field values, tags, or subscription status. Tags use a boolean map where \`true\` adds and \`false\` removes a tag.`,
  instructions: [
    'To add or remove tags, pass a tags object with tag names as keys and `true` (add) or `false` (remove) as values.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      listId: z.string().describe('ID of the list the contact belongs to'),
      contactId: z.string().describe('ID of the contact to update'),
      emailAddress: z.string().optional().describe('New email address for the contact'),
      fields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom field values to update'),
      tags: z
        .record(z.string(), z.boolean())
        .optional()
        .describe('Tags to add (true) or remove (false)'),
      status: z
        .enum(['SUBSCRIBED', 'UNSUBSCRIBED', 'PENDING'])
        .optional()
        .describe('New subscription status')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('Unique identifier of the updated contact'),
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
    let contact = await client.updateContact(ctx.input.listId, ctx.input.contactId, {
      emailAddress: ctx.input.emailAddress,
      fields: ctx.input.fields,
      tags: ctx.input.tags,
      status: ctx.input.status
    });

    return {
      output: contact,
      message: `Updated contact **${contact.emailAddress}**.`
    };
  })
  .build();
