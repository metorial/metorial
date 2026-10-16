import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let outputSchema = z.object({
  contactId: z.number().describe('Contact identifier'),
  tags: z.array(z.string()).describe('Contact tags after the update')
});

export let manageContactTags = SlateTool.create(spec, {
  name: 'Manage Contact Tags',
  key: 'manage_contact_tags',
  description:
    'Add, remove, or replace tags on an existing contact. Sync replaces the current tag set with the supplied non-empty list.',
  tags: { destructive: false }
})
  .input(
    z.object({
      contactId: z.number().describe('Contact ID from list_contacts'),
      action: z
        .enum(['add', 'remove', 'sync'])
        .describe('Whether to add, remove, or replace tags'),
      tags: z
        .array(z.string().min(1).max(64))
        .min(1)
        .describe('One or more tags, each up to 64 characters')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let contact = await client.manageContactTags(
      ctx.input.contactId,
      ctx.input.action,
      ctx.input.tags
    );
    return {
      output: client.output(outputSchema, { contactId: contact.id, tags: contact.tags }),
      message: client.publicData(`Updated tags for contact **${contact.id}**.`)
    };
  })
  .build();
