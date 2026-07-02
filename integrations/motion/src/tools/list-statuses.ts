import { SlateTool } from 'slates';
import { z } from 'zod';
import { MotionClient } from '../lib/client';
import { spec } from '../spec';

export let listStatuses = SlateTool.create(spec, {
  name: 'List Statuses',
  key: 'list_statuses',
  description: `List all available statuses for a workspace. Shows which statuses are default and which represent resolved/completed states.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z.string().describe('ID of the workspace to list statuses for')
    })
  )
  .output(
    z.object({
      statuses: z
        .array(
          z.object({
            name: z.string().describe('Name of the status'),
            isDefaultStatus: z
              .boolean()
              .describe('Whether this is the default status for new tasks'),
            isResolvedStatus: z
              .boolean()
              .describe('Whether this status represents a completed/resolved state')
          })
        )
        .describe('List of statuses in the workspace')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MotionClient({ token: ctx.auth.token });

    let statuses = await client.listStatuses(ctx.input.workspaceId);
    let statusList = Array.isArray(statuses) ? statuses : [];

    return {
      output: {
        statuses: statusList.map((s: any) => ({
          name: s.name,
          isDefaultStatus: s.isDefaultStatus,
          isResolvedStatus: s.isResolvedStatus
        }))
      },
      message: `Found **${statusList.length}** status(es) for workspace`
    };
  })
  .build();
