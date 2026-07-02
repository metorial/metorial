import { SlateTool } from 'slates';
import { z } from 'zod';
import { MotionClient } from '../lib/client';
import { spec } from '../spec';

export let listWorkspaces = SlateTool.create(spec, {
  name: 'List Workspaces',
  key: 'list_workspaces',
  description: `List all workspaces the authenticated user has access to. Returns workspace details including available labels and statuses. Can also retrieve specific workspaces by their IDs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceIds: z
        .array(z.string())
        .optional()
        .describe('Optionally filter to specific workspace IDs'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      workspaces: z
        .array(
          z.object({
            workspaceId: z.string().describe('Unique identifier of the workspace'),
            name: z.string().describe('Name of the workspace'),
            teamId: z.string().optional().describe('Team ID'),
            type: z.string().optional().describe('Workspace type (team or individual)'),
            labels: z.array(z.any()).optional().describe('Available labels in the workspace'),
            statuses: z
              .array(z.any())
              .optional()
              .describe('Available statuses in the workspace')
          })
        )
        .describe('List of workspaces'),
      nextCursor: z.string().optional().describe('Cursor for fetching the next page'),
      pageSize: z.number().optional().describe('Number of results returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MotionClient({ token: ctx.auth.token });

    let result = await client.listWorkspaces({
      ids: ctx.input.workspaceIds,
      cursor: ctx.input.cursor
    });

    let workspaces = (result.workspaces || []).map((w: any) => ({
      workspaceId: w.id,
      name: w.name,
      teamId: w.teamId,
      type: w.type,
      labels: w.labels,
      statuses: w.statuses
    }));

    return {
      output: {
        workspaces,
        nextCursor: result.meta?.nextCursor,
        pageSize: result.meta?.pageSize
      },
      message: `Found **${workspaces.length}** workspace(s)`
    };
  })
  .build();
