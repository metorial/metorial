import { SlateTool } from 'slates';
import { z } from 'zod';
import { StudioClient } from '../lib/client';
import { spec } from '../spec';

export let listWorkspaces = SlateTool.create(spec, {
  name: 'List Workspaces',
  key: 'list_workspaces',
  description: `Retrieve all workspaces the authenticated user belongs to (Studio API). Returns workspace IDs, titles, and the user's role in each workspace. The workspace ID is required for project and video operations.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      workspaces: z.array(
        z.object({
          workspaceId: z.string().describe('Unique workspace identifier'),
          title: z.string().describe('Workspace display name'),
          role: z.string().describe('User role in this workspace (user, admin, owner)')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new StudioClient(ctx.auth.token);
    let result = await client.listWorkspaces();

    return {
      output: {
        workspaces: result.workspaces.map(w => ({
          workspaceId: w.workspace_id,
          title: w.title,
          role: w.role
        }))
      },
      message: `Found **${result.workspaces.length}** workspace(s).`
    };
  })
  .build();
