import { SlateTool } from 'slates';
import { z } from 'zod';
import { GongClient } from '../lib/client';
import { spec } from '../spec';

export let listWorkspaces = SlateTool.create(spec, {
  name: 'List Workspaces',
  key: 'list_workspaces',
  description: `Retrieve all workspaces in the Gong organization. Workspaces are used to organize calls, users, and settings. Returns workspace IDs and names.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      workspaces: z
        .array(
          z.object({
            workspaceId: z.string().optional().describe('Workspace ID'),
            workspaceName: z.string().optional().describe('Workspace name'),
            description: z.string().optional().describe('Workspace description')
          })
        )
        .describe('List of workspaces')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GongClient({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl
    });

    let result = await client.listWorkspaces();
    let workspaces = (result.workspaces || []).map((w: any) => ({
      workspaceId: w.id || w.workspaceId,
      workspaceName: w.name || w.workspaceName,
      description: w.description
    }));

    return {
      output: { workspaces },
      message: `Retrieved ${workspaces.length} workspace(s).`
    };
  })
  .build();
