import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let upsertContact = SlateTool.create(spec, {
  name: 'Upsert Contact',
  key: 'upsert_contact',
  description: `Create a contact if it doesn't exist, or update it if it does (matched by email address). Useful for syncing contacts from external sources without needing to check existence first.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      listId: z.string().describe('ID of the list to upsert the contact in'),
      emailAddress: z.string().describe('Email address of the contact'),
      fields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom field values as key-value pairs where keys are field tags'),
      tags: z.array(z.string()).optional().describe('Tags to assign to the contact'),
      status: z
        .enum(['SUBSCRIBED', 'UNSUBSCRIBED', 'PENDING'])
        .optional()
        .describe('Subscription status')
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
    let contact = await client.upsertContact(ctx.input.listId, {
      emailAddress: ctx.input.emailAddress,
      fields: ctx.input.fields,
      tags: ctx.input.tags,
      status: ctx.input.status
    });

    return {
      output: contact,
      message: `Upserted contact **${contact.emailAddress}** (status: ${contact.status}).`
    };
  })
  .build();
