import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listWorkspaces = SlateTool.create(spec, {
  name: 'List Workspaces',
  key: 'list_workspaces',
  description: `List one page of accessible Tally workspaces. Workspaces are used to group related forms together.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({ page: z.number().optional().describe('One-based page number; default 1') })
  )
  .output(
    z.object({
      page: z.number().optional(),
      hasMore: z.boolean().optional(),
      workspaces: z
        .array(
          z.object({
            workspaceId: z.string().describe('Unique workspace identifier'),
            name: z.string().describe('Workspace name'),
            createdAt: z.string().describe('ISO 8601 creation timestamp'),
            updatedAt: z.string().describe('ISO 8601 last update timestamp')
          })
        )
        .describe('List of workspaces')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listWorkspaces(ctx.input.page);

    let workspaces = result.items.map(ws => ({
      workspaceId: ws.id,
      name: ws.name,
      createdAt: ws.createdAt,
      updatedAt: ws.updatedAt
    }));

    return {
      output: {
        workspaces,
        page: result.page,
        hasMore: result.hasMore
      },
      message: `Found **${workspaces.length}** workspace(s).`
    };
  })
  .build();
