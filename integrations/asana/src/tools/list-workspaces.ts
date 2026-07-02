import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listWorkspaces = SlateTool.create(spec, {
  name: 'List Workspaces',
  key: 'list_workspaces',
  description: `List all workspaces accessible to the authenticated user. Use this to discover available workspace GIDs needed by other tools.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Maximum number of workspaces to return (default 100)')
    })
  )
  .output(
    z.object({
      workspaces: z.array(
        z.object({
          workspaceId: z.string().describe('Workspace GID'),
          name: z.string().describe('Workspace name')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listWorkspaces({ limit: ctx.input.limit });
    let workspaces = (result.data || []).map((w: any) => ({
      workspaceId: w.gid,
      name: w.name
    }));

    return {
      output: { workspaces },
      message: `Found **${workspaces.length}** workspace(s).`
    };
  })
  .build();
