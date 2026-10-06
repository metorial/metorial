import { SlateTool } from 'slates';
import { z } from 'zod';
import { AdminClient } from '../lib/client';
import { spec } from '../spec';

export const listWorkspacesTool = SlateTool.create(spec, {
  key: 'list_workspaces',
  name: 'List Workspaces',
  description:
    'Discover workspaces accessible to the connected account. Use their workspace IDs with list_bots and other admin tools.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      nextToken: z
        .string()
        .optional()
        .describe('Pagination token from the previous response.'),
      handle: z.string().optional().describe('Filter by workspace handle.')
    })
  )
  .output(
    z.object({
      workspaces: z.array(
        z.object({
          workspaceId: z.string(),
          name: z.string(),
          ownerId: z.string(),
          botCount: z.number(),
          plan: z.string(),
          blocked: z.boolean(),
          handle: z.string().optional()
        })
      ),
      nextToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    const result = await new AdminClient({ token: ctx.auth.token }).listWorkspaces(ctx.input);
    const workspaces = result.workspaces.map((workspace: Record<string, unknown>) => ({
      workspaceId: workspace.id as string,
      name: workspace.name as string,
      ownerId: workspace.ownerId as string,
      botCount: workspace.botCount as number,
      plan: workspace.plan as string,
      blocked: workspace.blocked as boolean,
      handle: workspace.handle as string | undefined
    }));
    return {
      output: { workspaces, nextToken: result.meta?.nextToken },
      message: `Found **${workspaces.length}** workspace(s).`
    };
  })
  .build();
