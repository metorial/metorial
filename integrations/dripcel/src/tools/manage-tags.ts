import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTags = SlateTool.create(spec, {
  name: 'Manage Tags',
  key: 'manage_tags',
  description: `List all tags, retrieve a specific tag by ID, or delete a tag. Deleting a tag removes it from all associated contacts and campaigns.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'delete'])
        .describe('Action to perform: list all tags, get a single tag, or delete a tag'),
      tagId: z.string().optional().describe('Tag ID (required for get and delete actions)')
    })
  )
  .output(
    z.object({
      tags: z.array(z.any()).optional().describe('Array of tag objects (for list action)'),
      tag: z.any().optional().describe('Single tag object (for get action)'),
      deleted: z
        .boolean()
        .optional()
        .describe('Whether the tag was deleted (for delete action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let result = await client.getTags();
      let tags = Array.isArray(result.data) ? result.data : [];
      return {
        output: { tags },
        message: `Found **${tags.length}** tag(s).`
      };
    }

    if (!ctx.input.tagId) {
      throw new Error('tagId is required for get and delete actions');
    }

    if (ctx.input.action === 'get') {
      let result = await client.getTag(ctx.input.tagId);
      return {
        output: { tag: result.data },
        message: `Retrieved tag \`${ctx.input.tagId}\`.`
      };
    }

    // delete
    await client.deleteTag(ctx.input.tagId);
    return {
      output: { deleted: true },
      message: `Deleted tag \`${ctx.input.tagId}\`. It has been removed from all contacts and campaigns.`
    };
  })
  .build();
