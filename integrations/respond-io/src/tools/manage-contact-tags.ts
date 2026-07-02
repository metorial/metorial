import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageContactTags = SlateTool.create(spec, {
  name: 'Manage Contact Tags',
  key: 'manage_contact_tags',
  description: `Add or remove tags on a specific contact. Tags are used for grouping and filtering contacts. You can add and remove tags in a single operation.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact to manage tags for'),
      addTags: z.array(z.string()).optional().describe('Tags to add to the contact'),
      removeTags: z.array(z.string()).optional().describe('Tags to remove from the contact')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the contact'),
      addedTags: z.array(z.string()).optional().describe('Tags that were added'),
      removedTags: z.array(z.string()).optional().describe('Tags that were removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let addedTags: string[] = [];
    let removedTags: string[] = [];

    if (ctx.input.addTags && ctx.input.addTags.length > 0) {
      await client.addContactTags(ctx.input.contactId, ctx.input.addTags);
      addedTags = ctx.input.addTags;
    }

    if (ctx.input.removeTags && ctx.input.removeTags.length > 0) {
      await client.removeContactTags(ctx.input.contactId, ctx.input.removeTags);
      removedTags = ctx.input.removeTags;
    }

    let parts: string[] = [];
    if (addedTags.length > 0) parts.push(`added tags: ${addedTags.join(', ')}`);
    if (removedTags.length > 0) parts.push(`removed tags: ${removedTags.join(', ')}`);

    return {
      output: {
        contactId: ctx.input.contactId,
        addedTags,
        removedTags
      },
      message: `Updated tags on contact **${ctx.input.contactId}**: ${parts.join('; ') || 'no changes'}.`
    };
  })
  .build();
