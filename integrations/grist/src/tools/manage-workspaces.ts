import { SlateTool } from 'slates';
import { z } from 'zod';
import { GristClient } from '../lib/client';
import { spec } from '../spec';

let workspaceSchema = z.object({
  workspaceId: z.number().describe('Workspace ID'),
  name: z.string().describe('Workspace name'),
  docs: z
    .array(
      z.object({
        documentId: z.string().describe('Document ID'),
        name: z.string().describe('Document name'),
        isPinned: z.boolean().optional().describe('Whether the document is pinned')
      })
    )
    .optional()
    .describe('Documents in the workspace')
});

export let listWorkspaces = SlateTool.create(spec, {
  name: 'List Workspaces',
  key: 'list_workspaces',
  description: `List all workspaces in an organization, including their documents. Use the org ID from the List Organizations tool.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      orgId: z
        .union([z.number(), z.string()])
        .describe('Organization ID or "current" for the current org')
    })
  )
  .output(
    z.object({
      workspaces: z.array(workspaceSchema).describe('List of workspaces')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GristClient({
      token: ctx.auth.token,
      serverUrl: ctx.auth.serverUrl
    });

    let workspaces = await client.listWorkspaces(ctx.input.orgId);

    let result = workspaces.map((ws: any) => ({
      workspaceId: ws.id,
      name: ws.name,
      docs: ws.docs?.map((doc: any) => ({
        documentId: doc.id,
        name: doc.name,
        isPinned: doc.isPinned
      }))
    }));

    return {
      output: { workspaces: result },
      message: `Found **${result.length}** workspace(s).`
    };
  })
  .build();

export let createWorkspace = SlateTool.create(spec, {
  name: 'Create Workspace',
  key: 'create_workspace',
  description: `Create a new workspace in an organization.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      orgId: z.union([z.number(), z.string()]).describe('Organization ID or "current"'),
      name: z.string().describe('Name for the new workspace')
    })
  )
  .output(
    z.object({
      workspaceId: z.number().describe('ID of the created workspace')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GristClient({
      token: ctx.auth.token,
      serverUrl: ctx.auth.serverUrl
    });

    let workspaceId = await client.createWorkspace(ctx.input.orgId, ctx.input.name);

    return {
      output: { workspaceId },
      message: `Created workspace **${ctx.input.name}** with ID **${workspaceId}**.`
    };
  })
  .build();

export let deleteWorkspace = SlateTool.create(spec, {
  name: 'Delete Workspace',
  key: 'delete_workspace',
  description: `Soft-delete a workspace (move to trash) or permanently delete it. Soft-deleted workspaces can be restored.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      workspaceId: z.number().describe('Workspace ID to delete'),
      permanent: z
        .boolean()
        .optional()
        .describe('If true, permanently delete instead of soft-deleting')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the workspace was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GristClient({
      token: ctx.auth.token,
      serverUrl: ctx.auth.serverUrl
    });

    await client.deleteWorkspace(ctx.input.workspaceId, ctx.input.permanent);

    let action = ctx.input.permanent ? 'permanently deleted' : 'moved to trash';
    return {
      output: { deleted: true },
      message: `Workspace **${ctx.input.workspaceId}** was ${action}.`
    };
  })
  .build();
