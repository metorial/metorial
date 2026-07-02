import { SlateTool } from 'slates';
import { z } from 'zod';
import { CapsuleClient } from '../lib/client';
import { spec } from '../spec';

export let manageTags = SlateTool.create(spec, {
  name: 'Manage Tags',
  key: 'manage_tags',
  description: `List, create, update, or delete tag definitions for parties, opportunities, or projects in Capsule CRM. Tags are used to categorise and group records.`,
  instructions: [
    'Set the action to "list" to retrieve tags, "create" to add a new tag, "update" to rename a tag, or "delete" to remove a tag.',
    'The entityType determines which record type the tag applies to: "parties", "opportunities", or "kases" (projects).'
  ]
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Action to perform'),
      entityType: z
        .enum(['parties', 'opportunities', 'kases'])
        .describe('Entity type the tag applies to'),
      tagId: z.number().optional().describe('Tag ID (required for update and delete)'),
      name: z
        .string()
        .optional()
        .describe('Tag name (required for create, optional for update)'),
      dataTag: z.boolean().optional().describe('Whether this is a data tag (for create)')
    })
  )
  .output(
    z.object({
      tags: z
        .array(
          z.object({
            tagId: z.number().describe('Tag ID'),
            name: z.string().describe('Tag name'),
            dataTag: z.boolean().optional().describe('Whether this is a data tag')
          })
        )
        .optional()
        .describe('List of tags (for list action)'),
      tag: z
        .object({
          tagId: z.number().describe('Tag ID'),
          name: z.string().describe('Tag name')
        })
        .optional()
        .describe('Created or updated tag'),
      success: z.boolean().optional().describe('Whether delete was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CapsuleClient({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let result = await client.listTags(ctx.input.entityType);
      let tags = (result.tags || []).map((t: any) => ({
        tagId: t.id,
        name: t.name,
        dataTag: t.dataTag
      }));

      return {
        output: { tags },
        message: `Found **${tags.length}** tags for ${ctx.input.entityType}.`
      };
    }

    if (ctx.input.action === 'create') {
      let tag: Record<string, any> = { name: ctx.input.name };
      if (ctx.input.dataTag !== undefined) tag.dataTag = ctx.input.dataTag;

      let result = await client.createTag(ctx.input.entityType, tag);

      return {
        output: { tag: { tagId: result.id, name: result.name } },
        message: `Created tag **"${result.name}"** for ${ctx.input.entityType}.`
      };
    }

    if (ctx.input.action === 'update') {
      let result = await client.updateTag(ctx.input.entityType, ctx.input.tagId!, {
        name: ctx.input.name
      });

      return {
        output: { tag: { tagId: result.id, name: result.name } },
        message: `Updated tag **"${result.name}"**.`
      };
    }

    if (ctx.input.action === 'delete') {
      await client.deleteTag(ctx.input.entityType, ctx.input.tagId!);

      return {
        output: { success: true },
        message: `Deleted tag **#${ctx.input.tagId}**.`
      };
    }

    return {
      output: {},
      message: 'No action performed.'
    };
  })
  .build();
