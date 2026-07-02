import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listWorkspaces = SlateTool.create(spec, {
  name: 'List Workspaces',
  key: 'list_workspaces',
  description: `Lists all workspaces the authenticated user has access to. Useful for discovering available workspace IDs.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      workspaces: z
        .array(
          z.object({
            workspaceId: z.number().describe('Workspace ID'),
            name: z.string().describe('Workspace name')
          })
        )
        .describe('Available workspaces')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.auth.workspaceId
    });

    let result = await client.listWorkspaces();
    let workspaces = (Array.isArray(result) ? result : []).map((ws: any) => ({
      workspaceId: ws.id,
      name: ws.name
    }));

    return {
      output: { workspaces },
      message: `Found **${workspaces.length}** workspace(s)`
    };
  })
  .build();
