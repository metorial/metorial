import { SlateTool } from 'slates';
import { z } from 'zod';
import { PowerBIClient } from '../lib/client';
import { spec } from '../spec';

let workspaceSchema = z.object({
  workspaceId: z.string().describe('Unique identifier of the workspace'),
  name: z.string().describe('Display name of the workspace'),
  isReadOnly: z.boolean().optional().describe('Whether the workspace is read-only'),
  isOnDedicatedCapacity: z
    .boolean()
    .optional()
    .describe('Whether the workspace is on a dedicated capacity'),
  capacityId: z.string().optional().describe('Capacity ID if assigned to a capacity'),
  type: z.string().optional().describe('Workspace type')
});

export let listWorkspaces = SlateTool.create(spec, {
  name: 'List Workspaces',
  key: 'list_workspaces',
  description: `List all Power BI workspaces (groups) accessible to the authenticated user. Returns workspace names, IDs, capacity assignments, and read-only status.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      workspaces: z.array(workspaceSchema).describe('List of accessible workspaces')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PowerBIClient({ token: ctx.auth.token });
    let workspaces = await client.listWorkspaces();

    let mapped = workspaces.map((w: any) => ({
      workspaceId: w.id,
      name: w.name,
      isReadOnly: w.isReadOnly,
      isOnDedicatedCapacity: w.isOnDedicatedCapacity,
      capacityId: w.capacityId,
      type: w.type
    }));

    return {
      output: { workspaces: mapped },
      message: `Found **${mapped.length}** workspace(s).`
    };
  })
  .build();
