import { SlateTool } from 'slates';
import { z } from 'zod';
import { TrelloClient } from '../lib/client';
import { spec } from '../spec';

let workspaceSchema = z.object({
  workspaceId: z.string().describe('Workspace/organization ID'),
  name: z.string().optional().describe('Workspace short name'),
  displayName: z.string().optional().describe('Workspace display name'),
  description: z.string().optional().describe('Workspace description'),
  url: z.string().optional().describe('Workspace URL')
});

let mapWorkspace = (workspace: any) => ({
  workspaceId: workspace.id,
  name: workspace.name || undefined,
  displayName: workspace.displayName || undefined,
  description: workspace.desc || undefined,
  url: workspace.url || undefined
});

export let getWorkspaces = SlateTool.create(spec, {
  name: 'Get Workspaces',
  key: 'get_workspaces',
  description: `List Trello workspaces accessible to the authenticated user, or retrieve one workspace by ID. Use to discover workspace IDs for board filtering and organization-owned boards.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z
        .string()
        .optional()
        .describe(
          'Workspace/organization ID to retrieve. If omitted, lists accessible workspaces'
        ),
      memberId: z
        .string()
        .optional()
        .describe(
          'Member ID whose workspaces should be listed. Defaults to the authenticated user ("me")'
        )
    })
  )
  .output(
    z.object({
      workspaces: z.array(workspaceSchema).describe('Accessible Trello workspaces')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TrelloClient({ apiKey: ctx.auth.apiKey, token: ctx.auth.token });

    if (ctx.input.workspaceId) {
      let workspace = await client.getOrganization(ctx.input.workspaceId);

      return {
        output: { workspaces: [mapWorkspace(workspace)] },
        message: `Retrieved workspace **${workspace.displayName || workspace.name}**.`
      };
    }

    let rawWorkspaces = await client.getMemberOrganizations(ctx.input.memberId || 'me');
    let workspaces = rawWorkspaces.map(mapWorkspace);

    return {
      output: { workspaces },
      message: `Found **${workspaces.length}** workspace(s).`
    };
  })
  .build();
