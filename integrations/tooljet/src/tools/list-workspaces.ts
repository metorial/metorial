import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let groupSchema = z.object({
  groupId: z.string().describe('ID of the group'),
  groupName: z.string().describe('Name of the group')
});

let workspaceSchema = z.object({
  workspaceId: z.string().describe('UUID of the workspace'),
  workspaceName: z.string().describe('Name of the workspace'),
  status: z.string().describe('Status of the workspace'),
  groups: z.array(groupSchema).optional().describe('Groups available in the workspace')
});

export let listWorkspaces = SlateTool.create(spec, {
  name: 'List Workspaces',
  key: 'list_workspaces',
  description: `Retrieve all workspaces on the ToolJet instance, including their status and available groups.`,
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
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let rawWorkspaces = await client.listWorkspaces();

    let workspaces = rawWorkspaces.map((w: any) => ({
      workspaceId: w.id,
      workspaceName: w.name,
      status: w.status,
      groups: w.groups?.map((g: any) => ({
        groupId: g.id,
        groupName: g.name
      }))
    }));

    return {
      output: { workspaces },
      message: `Found **${workspaces.length}** workspace(s).`
    };
  })
  .build();
