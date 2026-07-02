import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoodyClient } from '../lib/client';
import { spec } from '../spec';

let workspaceSchema = z.object({
  workspaceId: z.string().describe('Workspace ID'),
  name: z.string().describe('Workspace name')
});

export let listWorkspaces = SlateTool.create(spec, {
  name: 'List Workspaces',
  key: 'list_workspaces',
  description: `List all workspaces accessible from the account. Workspace IDs can be used when creating order batches to specify which workspace to charge.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      workspaces: z.array(workspaceSchema).describe('List of workspaces')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoodyClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let result = await client.listWorkspaces();

    let workspaces = (Array.isArray(result) ? result : result.data || []).map((w: any) => ({
      workspaceId: w.id,
      name: w.name
    }));

    return {
      output: { workspaces },
      message: `Found **${workspaces.length}** workspace(s).`
    };
  })
  .build();
