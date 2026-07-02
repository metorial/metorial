import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTags = SlateTool.create(spec, {
  name: 'Manage Tags',
  key: 'manage_tags',
  description: `Create, rename, delete, or list tags on a contact list. Tags are labels used for segmenting and targeting contacts.
Use **action** to specify the operation: \`list\`, \`create\`, \`rename\`, or \`delete\`.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      listId: z.string().describe('ID of the list to manage tags on'),
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
      tags: z
        .array(z.string())
        .optional()
        .describe('List of all tags on the list (returned for list action)'),
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
      let tags = await client.getTags(listId);
      return {
        output: { tags },
        message: `Found ${tags.length} tag(s) on the list.`
      };
    }

    if (action === 'create') {
      if (!tag) throw new Error('Tag name is required for create action.');
      let created = await client.createTag(listId, tag);
      return {
        output: { tag: created },
        message: `Created tag **${created}**.`
      };
    }

    if (action === 'rename') {
      if (!tag) throw new Error('Tag name is required for rename action.');
      if (!newTag) throw new Error('New tag name is required for rename action.');
      let renamed = await client.updateTag(listId, tag, newTag);
      return {
        output: { tag: renamed },
        message: `Renamed tag from **${tag}** to **${renamed}**.`
      };
    }

    if (action === 'delete') {
      if (!tag) throw new Error('Tag name is required for delete action.');
      await client.deleteTag(listId, tag);
      return {
        output: { deleted: true },
        message: `Deleted tag **${tag}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
