import { SlateTool } from 'slates';
import { z } from 'zod';
import { TogglClient } from '../lib/client';
import { spec } from '../spec';

export let listTags = SlateTool.create(spec, {
  name: 'List Tags',
  key: 'list_tags',
  description: `List all tags in a Toggl workspace. Tags are used to mark time entries for cross-project filtering and categorization.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z
        .string()
        .optional()
        .describe('Workspace ID. Uses the configured default if not provided.')
    })
  )
  .output(
    z.object({
      tags: z
        .array(
          z.object({
            tagId: z.number().describe('Tag ID'),
            name: z.string().describe('Tag name'),
            workspaceId: z.number().describe('Workspace ID')
          })
        )
        .describe('List of tags'),
      totalCount: z.number().describe('Number of tags returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TogglClient(ctx.auth.token);
    let wsId = ctx.input.workspaceId ?? ctx.config.workspaceId;

    let raw = await client.listTags(wsId);

    let mappedTags = (raw ?? []).map((t: any) => ({
      tagId: t.id,
      name: t.name,
      workspaceId: t.workspace_id ?? t.wid
    }));

    return {
      output: { tags: mappedTags, totalCount: mappedTags.length },
      message: `Found **${mappedTags.length}** tags`
    };
  })
  .build();
