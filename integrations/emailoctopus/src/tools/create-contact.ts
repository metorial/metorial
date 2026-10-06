import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { listIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Add a new contact to a list with an email address, optional custom field values, tags, and subscription status. If the list has double opt-in enabled, the contact will receive a confirmation email.`,
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      listId: listIdSchema,
      emailAddress: z.string().describe('Email address for the new contact'),
      fields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom field values as key-value pairs where keys are field tags'),
      fieldValues: z
        .record(z.string(), z.union([z.string(), z.number(), z.null()]))
        .optional()
        .describe(
          'Typed custom field values; null clears a field. Do not conflict with fields.'
        ),
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
      fields: z
        .record(z.string(), z.string())
        .describe('Custom field values as text; null is an empty string'),
      fieldValues: z
        .record(z.string(), z.union([z.string(), z.number(), z.null()]))
        .optional()
        .describe('Original typed custom field values'),
      tags: z.array(z.string()).describe('Tags assigned to the contact'),
      status: z
        .string()
        .describe(
          'Subscription status; uppercase inputs are normalized to lowercase API values'
        ),
      createdAt: z.string().describe('ISO 8601 creation timestamp'),
      lastUpdatedAt: z.string().describe('ISO 8601 last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let contact = await client.createContact(ctx.input.listId, {
      emailAddress: ctx.input.emailAddress,
      fields: ctx.input.fields,
      fieldValues: ctx.input.fieldValues,
      tags: ctx.input.tags,
      status: ctx.input.status
    });

    return {
      output: contact,
      message: `Created contact **${contact.emailAddress}** with status ${contact.status}.`
    };
  })
  .build();
