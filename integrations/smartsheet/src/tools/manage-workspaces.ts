import { SlateTool } from 'slates';
import { z } from 'zod';
import { SmartsheetClient } from '../lib/client';
import { spec } from '../spec';

let workspaceSchema = z.object({
  workspaceId: z.number().describe('Workspace ID'),
  name: z.string().describe('Workspace name'),
  accessLevel: z.string().optional().describe('Current user access level'),
  permalink: z.string().optional().describe('URL to the workspace')
});

export let listWorkspaces = SlateTool.create(spec, {
  name: 'List Workspaces',
  key: 'list_workspaces',
  description: `List all workspaces accessible to the current user. Workspaces are top-level containers for organizing sheets, reports, and dashboards.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      includeAll: z.boolean().optional().describe('Return all workspaces without pagination')
    })
  )
  .output(
    z.object({
      workspaces: z.array(workspaceSchema).describe('List of workspaces'),
      totalCount: z.number().optional().describe('Total number of workspaces')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SmartsheetClient({ token: ctx.auth.token });
    let result = await client.listWorkspaces({ includeAll: ctx.input.includeAll });

    let workspaces = (result.data || []).map((w: any) => ({
      workspaceId: w.id,
      name: w.name,
      accessLevel: w.accessLevel,
      permalink: w.permalink
    }));

    return {
      output: { workspaces, totalCount: result.totalCount },
      message: `Found **${workspaces.length}** workspace(s).`
    };
  })
  .build();

export let getWorkspace = SlateTool.create(spec, {
  name: 'Get Workspace',
  key: 'get_workspace',
  description: `Get details of a workspace including its contained sheets, folders, reports, and dashboards.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      workspaceId: z.string().describe('ID of the workspace'),
      loadAll: z.boolean().optional().describe('Load all contents recursively')
    })
  )
  .output(
    z.object({
      workspaceId: z.number().describe('Workspace ID'),
      name: z.string().describe('Workspace name'),
      accessLevel: z.string().optional().describe('Current user access level'),
      permalink: z.string().optional().describe('URL to the workspace'),
      sheets: z
        .array(
          z.object({
            sheetId: z.number().describe('Sheet ID'),
            name: z.string().describe('Sheet name')
          })
        )
        .optional()
        .describe('Sheets in this workspace'),
      folders: z
        .array(
          z.object({
            folderId: z.number().describe('Folder ID'),
            name: z.string().describe('Folder name')
          })
        )
        .optional()
        .describe('Folders in this workspace'),
      reports: z
        .array(
          z.object({
            reportId: z.number().describe('Report ID'),
            name: z.string().describe('Report name')
          })
        )
        .optional()
        .describe('Reports in this workspace'),
      dashboards: z
        .array(
          z.object({
            dashboardId: z.number().describe('Dashboard ID'),
            name: z.string().describe('Dashboard name')
          })
        )
        .optional()
        .describe('Dashboards in this workspace')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SmartsheetClient({ token: ctx.auth.token });
    let ws = await client.getWorkspace(ctx.input.workspaceId, {
      loadAll: ctx.input.loadAll
    });

    return {
      output: {
        workspaceId: ws.id,
        name: ws.name,
        accessLevel: ws.accessLevel,
        permalink: ws.permalink,
        sheets: (ws.sheets || []).map((s: any) => ({ sheetId: s.id, name: s.name })),
        folders: (ws.folders || []).map((f: any) => ({ folderId: f.id, name: f.name })),
        reports: (ws.reports || []).map((r: any) => ({ reportId: r.id, name: r.name })),
        dashboards: (ws.sights || []).map((d: any) => ({ dashboardId: d.id, name: d.name }))
      },
      message: `Retrieved workspace **${ws.name}** with ${(ws.sheets || []).length} sheet(s), ${(ws.folders || []).length} folder(s).`
    };
  })
  .build();

export let createWorkspace = SlateTool.create(spec, {
  name: 'Create Workspace',
  key: 'create_workspace',
  description: `Create a new workspace. Workspaces serve as top-level organizational containers with their own sharing permissions.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      name: z.string().describe('Name for the new workspace')
    })
  )
  .output(
    z.object({
      workspaceId: z.number().describe('ID of the created workspace'),
      name: z.string().describe('Workspace name'),
      accessLevel: z.string().optional().describe('Access level'),
      permalink: z.string().optional().describe('URL to the workspace')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SmartsheetClient({ token: ctx.auth.token });
    let result = await client.createWorkspace({ name: ctx.input.name });
    let ws = result.result || result;

    return {
      output: {
        workspaceId: ws.id,
        name: ws.name,
        accessLevel: ws.accessLevel,
        permalink: ws.permalink
      },
      message: `Created workspace **${ws.name}** (ID: ${ws.id}).`
    };
  })
  .build();

export let deleteWorkspace = SlateTool.create(spec, {
  name: 'Delete Workspace',
  key: 'delete_workspace',
  description: `Permanently delete a workspace and all its contents. This cannot be undone.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      workspaceId: z.string().describe('ID of the workspace to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SmartsheetClient({ token: ctx.auth.token });
    await client.deleteWorkspace(ctx.input.workspaceId);

    return {
      output: { success: true },
      message: `Deleted workspace **${ctx.input.workspaceId}**.`
    };
  })
  .build();
