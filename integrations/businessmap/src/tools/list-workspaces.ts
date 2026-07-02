import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listWorkspacesTool = SlateTool.create(spec, {
  name: 'List Workspaces',
  key: 'list_workspaces',
  description: `List all workspaces in your Kanbanize account. Workspaces are organizational containers that group related boards.`,
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
            workspaceId: z.number().describe('Workspace ID'),
            name: z.string().optional().describe('Workspace name'),
            type: z.number().optional().describe('Workspace type'),
            isArchived: z
              .number()
              .optional()
              .describe('Whether the workspace is archived (0 or 1)')
          })
        )
        .describe('List of workspaces')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.auth.subdomain
    });

    let result = await client.listWorkspaces();
    let workspaces = Array.isArray(result) ? result : [];

    return {
      output: {
        workspaces: workspaces.map((w: any) => ({
          workspaceId: w.workspace_id,
          name: w.name,
          type: w.type,
          isArchived: w.is_archived
        }))
      },
      message: `Found **${workspaces.length}** workspace(s).`
    };
  })
  .build();
