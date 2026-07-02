import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageTags = SlateTool.create(spec, {
  name: 'Manage Tags',
  key: 'manage_tags',
  description: `List, create, update, or delete content tags in the current environment. Tags help organize and filter content.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Action to perform.'),
      tagId: z
        .string()
        .optional()
        .describe('Tag ID. Required for create, update, and delete.'),
      name: z
        .string()
        .optional()
        .describe('Tag display name. Required for create and update.'),
      visibility: z
        .enum(['private', 'public'])
        .optional()
        .describe('Tag visibility. Only used when creating.'),
      version: z
        .number()
        .optional()
        .describe(
          'Current version. Required for update and delete (fetched automatically if omitted).'
        )
    })
  )
  .output(
    z.object({
      action: z.string().describe('Action performed.'),
      tagId: z.string().optional().describe('Tag ID.'),
      name: z.string().optional().describe('Tag name.'),
      tags: z
        .array(
          z.object({
            tagId: z.string().describe('Tag ID.'),
            name: z.string().describe('Tag name.'),
            visibility: z.string().optional().describe('Tag visibility.')
          })
        )
        .optional()
        .describe('List of tags (only for list action).')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let { action, tagId, name } = ctx.input;

    switch (action) {
      case 'list': {
        let result = await client.getTags();
        let tagsList = (result.items || []).map((t: any) => ({
          tagId: t.sys?.id,
          name: t.name,
          visibility: t.sys?.visibility
        }));
        return {
          output: { action, tags: tagsList },
          message: `Found **${tagsList.length}** tags.`
        };
      }
      case 'create': {
        if (!tagId || !name) throw new Error('tagId and name are required for creating a tag');
        let created = await client.createTag(tagId, name, ctx.input.visibility);
        return {
          output: { action, tagId: created.sys?.id, name: created.name },
          message: `Created tag **${tagId}** ("${name}").`
        };
      }
      case 'update': {
        if (!tagId || !name) throw new Error('tagId and name are required for updating a tag');
        let version = ctx.input.version;
        if (!version) {
          let current = await client.getTag(tagId);
          version = current.sys.version;
        }
        let updated = await client.updateTag(tagId, name, version!);
        return {
          output: { action, tagId: updated.sys?.id, name: updated.name },
          message: `Updated tag **${tagId}** to "${name}".`
        };
      }
      case 'delete': {
        if (!tagId) throw new Error('tagId is required for deleting a tag');
        let version = ctx.input.version;
        if (!version) {
          let current = await client.getTag(tagId);
          version = current.sys.version;
        }
        await client.deleteTag(tagId, version!);
        return {
          output: { action, tagId },
          message: `Deleted tag **${tagId}**.`
        };
      }
    }
  })
  .build();
