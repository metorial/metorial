import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, invalid } from '../lib/client';
import { listIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let manageTags = SlateTool.create(spec, {
  name: 'Manage Tags',
  key: 'manage_tags',
  description: `Create, rename, delete, or list tags on a contact list. Tags are labels used for segmenting and targeting contacts.
Use **action** to specify the operation: \`list\`, \`create\`, \`rename\`, or \`delete\`.`,
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      startingAfter: z.string().optional().describe('Cursor from a previous tag-list page'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum tags per page, 1–100'),
      listId: listIdSchema,
      action: z.enum(['list', 'create', 'rename', 'delete']).describe('Operation to perform'),
      tag: z
        .string()
        .optional()
        .describe('Tag name. Required for create, rename, and delete.'),
      newTag: z.string().optional().describe('New tag name. Required for rename.')
    })
  )
  .output(
    z.object({
      pagingNext: z
        .string()
        .nullable()
        .optional()
        .describe('Cursor for the next tag-list page'),
      tags: z
        .array(z.string())
        .optional()
        .describe('Tags on this result page (returned for list action)'),
      tag: z.string().optional().describe('The created, renamed, or deleted tag name'),
      deleted: z
        .boolean()
        .optional()
        .describe('Whether the tag was deleted (returned for delete action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, listId, tag, newTag } = ctx.input;

    if (action === 'list') {
      let result = await client.getTags(listId, ctx.input.startingAfter, ctx.input.limit);
      let tags = result.data;
      return {
        output: { tags, pagingNext: result.pagingNext },
        message: `Found ${tags.length} tag(s) on the list.`
      };
    }

    if (action === 'create') {
      if (!tag) throw invalid('Tag name is required for create action.');
      let created = await client.createTag(listId, tag);
      return {
        output: { tag: created },
        message: `Created tag **${created}**.`
      };
    }

    if (action === 'rename') {
      if (!tag) throw invalid('Tag name is required for rename action.');
      if (!newTag) throw invalid('New tag name is required for rename action.');
      let renamed = await client.updateTag(listId, tag, newTag);
      return {
        output: { tag: renamed },
        message: `Renamed tag from **${client.safeText(tag)}** to **${renamed}**.`
      };
    }

    if (action === 'delete') {
      if (!tag) throw invalid('Tag name is required for delete action.');
      await client.deleteTag(listId, tag);
      return {
        output: { deleted: true },
        message: `Deleted tag **${client.safeText(tag)}**.`
      };
    }

    throw invalid(`Unknown action: ${action}`);
  })
  .build();
