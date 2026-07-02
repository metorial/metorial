import { SlateTool } from 'slates';
import { z } from 'zod';
import { PowerBIClient } from '../lib/client';
import { spec } from '../spec';

export let assignWorkspaceCapacity = SlateTool.create(spec, {
  name: 'Assign Workspace to Capacity',
  key: 'assign_workspace_capacity',
  description: `Assign or unassign a Power BI workspace to/from a Premium or Embedded capacity. Assigning enables premium features like paginated reports and larger datasets.`,
  instructions: [
    'Use action "assign" to move a workspace to a specific capacity.',
    'Use action "unassign" to remove capacity assignment (moves to shared capacity).'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['assign', 'unassign'])
        .describe('Whether to assign or unassign capacity'),
      workspaceId: z.string().describe('ID of the workspace'),
      capacityId: z
        .string()
        .optional()
        .describe('ID of the capacity to assign to (required for assign)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PowerBIClient({ token: ctx.auth.token });

    if (ctx.input.action === 'assign') {
      if (!ctx.input.capacityId) throw new Error('capacityId is required for assign');
      await client.assignWorkspaceToCapacity(ctx.input.workspaceId, ctx.input.capacityId);
      return {
        output: { success: true },
        message: `Assigned workspace **${ctx.input.workspaceId}** to capacity **${ctx.input.capacityId}**.`
      };
    }

    await client.unassignWorkspaceFromCapacity(ctx.input.workspaceId);
    return {
      output: { success: true },
      message: `Unassigned workspace **${ctx.input.workspaceId}** from capacity (moved to shared).`
    };
  })
  .build();
