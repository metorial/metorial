import { SlateTool } from 'slates';
import { z } from 'zod';
import { NerdGraphClient } from '../lib/client';
import { spec } from '../spec';

let tagInput = z.object({
  key: z.string().describe('Tag key'),
  values: z.array(z.string()).describe('Tag values')
});

export let manageEntityTags = SlateTool.create(spec, {
  name: 'Manage Entity Tags',
  key: 'manage_entity_tags',
  description: `Add, replace, or delete tags on a New Relic entity. Tags help organize and filter entities across your environment.`,
  instructions: [
    '`action: "add"` — Adds new tags (merges with existing tags).',
    '`action: "replace"` — Replaces all tags on the entity with the provided tags.',
    '`action: "delete"` — Deletes tags by key name.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      entityGuid: z.string().describe('Entity GUID to manage tags for'),
      action: z.enum(['add', 'replace', 'delete']).describe('Tag operation to perform'),
      tags: z
        .array(tagInput)
        .optional()
        .describe('Tags to add or replace (required for add/replace actions)'),
      tagKeys: z
        .array(z.string())
        .optional()
        .describe('Tag keys to delete (required for delete action)')
    })
  )
  .output(
    z.object({
      entityGuid: z.string().describe('Entity GUID that was updated'),
      success: z.boolean().describe('Whether the operation completed successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NerdGraphClient({
      token: ctx.auth.token,
      region: ctx.config.region,
      accountId: ctx.config.accountId
    });

    let { action, entityGuid } = ctx.input;

    if (action === 'add') {
      if (!ctx.input.tags?.length) throw new Error('tags are required for add action');
      ctx.progress('Adding tags...');
      await client.addEntityTags(entityGuid, ctx.input.tags);
      return {
        output: { entityGuid, success: true },
        message: `Added **${ctx.input.tags.length}** tag(s) to entity **${entityGuid}**.`
      };
    }

    if (action === 'replace') {
      if (!ctx.input.tags?.length) throw new Error('tags are required for replace action');
      ctx.progress('Replacing tags...');
      await client.replaceEntityTags(entityGuid, ctx.input.tags);
      return {
        output: { entityGuid, success: true },
        message: `Replaced all tags on entity **${entityGuid}** with **${ctx.input.tags.length}** tag(s).`
      };
    }

    // delete
    if (!ctx.input.tagKeys?.length) throw new Error('tagKeys are required for delete action');
    ctx.progress('Deleting tags...');
    await client.deleteEntityTags(entityGuid, ctx.input.tagKeys);
    return {
      output: { entityGuid, success: true },
      message: `Deleted **${ctx.input.tagKeys.length}** tag key(s) from entity **${entityGuid}**.`
    };
  })
  .build();
