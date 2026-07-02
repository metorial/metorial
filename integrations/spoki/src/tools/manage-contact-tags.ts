import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageContactTags = SlateTool.create(spec, {
  name: 'Manage Contact Tags',
  key: 'manage_contact_tags',
  description: `Adds or removes tags on a Spoki contact. Use this to segment and organize contacts with labels.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact'),
      action: z.enum(['add', 'remove']).describe('Whether to add or remove the tag'),
      tag: z.string().describe('Tag name to add or remove')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the contact'),
      tag: z.string().describe('The tag that was added or removed'),
      action: z.string().describe('The action performed'),
      raw: z.any().optional().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result: any;
    if (ctx.input.action === 'add') {
      ctx.info(`Adding tag "${ctx.input.tag}" to contact ${ctx.input.contactId}`);
      result = await client.addTagToContact(ctx.input.contactId, ctx.input.tag);
    } else {
      ctx.info(`Removing tag "${ctx.input.tag}" from contact ${ctx.input.contactId}`);
      result = await client.removeTagFromContact(ctx.input.contactId, ctx.input.tag);
    }

    return {
      output: {
        contactId: ctx.input.contactId,
        tag: ctx.input.tag,
        action: ctx.input.action,
        raw: result
      },
      message:
        ctx.input.action === 'add'
          ? `Added tag **${ctx.input.tag}** to contact ${ctx.input.contactId}`
          : `Removed tag **${ctx.input.tag}** from contact ${ctx.input.contactId}`
    };
  })
  .build();
