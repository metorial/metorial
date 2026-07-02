import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

// ── List Tags ──

export let listTags = SlateTool.create(spec, {
  name: 'List Tags',
  key: 'list_tags',
  description: `List all user-defined tags used to categorize outgoing emails. Tags are assigned when sending emails (up to 4 per email) and can be used to filter and analyze delivery statistics.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      tags: z
        .array(
          z.object({
            tag: z.string().describe('Tag name'),
            status: z.string().optional().describe('Tag status')
          })
        )
        .describe('List of tags')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      datacenter: ctx.config.datacenter
    });

    let result = await client.listTags();

    let tagList = (result.tags ?? []).map(t => ({
      tag: t.tag,
      status: t.status
    }));

    return {
      output: { tags: tagList },
      message: `Found **${tagList.length}** tag(s).`
    };
  })
  .build();

// ── Delete Tag ──

export let deleteTag = SlateTool.create(spec, {
  name: 'Delete Tag',
  key: 'delete_tag',
  description: `Delete a user-defined email tag. This removes the tag from the system but does not affect previously sent emails that used this tag.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      tag: z.string().describe('Tag name to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the tag was deleted successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      datacenter: ctx.config.datacenter
    });

    let result = await client.deleteTag(ctx.input.tag);

    return {
      output: { success: result.status === 'success' },
      message: `Tag **${ctx.input.tag}** deleted.`
    };
  })
  .build();
