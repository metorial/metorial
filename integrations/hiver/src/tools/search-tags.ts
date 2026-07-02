import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchTags = SlateTool.create(spec, {
  name: 'Search Inbox Tags',
  key: 'search_inbox_tags',
  description: `Search for tags within a specific shared inbox. Can list all tags or search by name query. Useful for discovering available tags for categorizing conversations.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      inboxId: z.string().describe('ID of the inbox to search tags in'),
      query: z
        .string()
        .optional()
        .describe('Search query to filter tags by name. Leave empty to list all tags.')
    })
  )
  .output(
    z.object({
      tags: z
        .array(
          z.object({
            tagId: z.string().describe('Unique identifier of the tag'),
            name: z.string().optional().describe('Name of the tag'),
            color: z.string().optional().describe('Color of the tag')
          })
        )
        .describe('List of matching tags')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let tagsList: any;
    if (ctx.input.query) {
      tagsList = await client.searchInboxTags(ctx.input.inboxId, ctx.input.query);
    } else {
      tagsList = await client.getInboxTags(ctx.input.inboxId);
    }

    let mapped = tagsList.map((t: any) => ({
      tagId: String(t.id),
      name: t.name,
      color: t.color
    }));

    return {
      output: { tags: mapped },
      message: `Found **${mapped.length}** tag(s)${ctx.input.query ? ` matching "${ctx.input.query}"` : ''}.`
    };
  });
