import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let workspaceSchema = z.object({
  workspaceId: z.string().describe('Unique workspace identifier'),
  name: z.string().describe('Workspace name'),
  dateCreated: z.string().describe('ISO 8601 creation date'),
  dateUpdated: z.string().describe('ISO 8601 last update date')
});

export let listWorkspaces = SlateTool.create(spec, {
  name: 'List Workspaces',
  key: 'list_workspaces',
  description: `List all workspaces in your DynaPictures account. Workspaces organize templates, media library assets, and generated images for multitenancy or project isolation.`,
  tags: {
    destructive: false,
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
    let client = new Client({ token: ctx.auth.token });
    let workspaces = await client.listWorkspaces();

    let mapped = workspaces.map(w => ({
      workspaceId: w.id,
      name: w.name,
      dateCreated: w.dateCreated,
      dateUpdated: w.dateUpdated
    }));

    return {
      output: { workspaces: mapped },
      message: `Found **${mapped.length}** workspace(s).`
    };
  })
  .build();

export let createWorkspace = SlateTool.create(spec, {
  name: 'Create Workspace',
  key: 'create_workspace',
  description: `Create a new workspace in DynaPictures. Workspaces provide isolated environments for templates, media assets, and generated images. Useful for per-client or per-project organization.`,
  constraints: ['Only account admins can create workspaces.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the new workspace')
    })
  )
  .output(workspaceSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let workspace = await client.createWorkspace(ctx.input.name);

    return {
      output: {
        workspaceId: workspace.id,
        name: workspace.name,
        dateCreated: workspace.dateCreated,
        dateUpdated: workspace.dateUpdated
      },
      message: `Created workspace **${workspace.name}** (${workspace.id}).`
    };
  })
  .build();

export let updateWorkspace = SlateTool.create(spec, {
  name: 'Update Workspace',
  key: 'update_workspace',
  description: `Update an existing workspace in DynaPictures. Currently supports renaming the workspace.`,
  constraints: ['Only account admins can modify workspaces.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      workspaceId: z.string().describe('ID of the workspace to update'),
      name: z.string().describe('New name for the workspace')
    })
  )
  .output(workspaceSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let workspace = await client.updateWorkspace(ctx.input.workspaceId, ctx.input.name);

    return {
      output: {
        workspaceId: workspace.id,
        name: workspace.name,
        dateCreated: workspace.dateCreated,
        dateUpdated: workspace.dateUpdated
      },
      message: `Updated workspace to **${workspace.name}**.`
    };
  })
  .build();

export let deleteWorkspace = SlateTool.create(spec, {
  name: 'Delete Workspace',
  key: 'delete_workspace',
  description: `Permanently delete a workspace and all its contents from DynaPictures. This removes all templates, media library files, and generated images within the workspace.`,
  constraints: [
    'Only account admins can delete workspaces.',
    'This action is irreversible. All templates, media files, and generated images in the workspace will be permanently deleted.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      workspaceId: z.string().describe('ID of the workspace to delete')
    })
  )
  .output(workspaceSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let workspace = await client.deleteWorkspace(ctx.input.workspaceId);

    return {
      output: {
        workspaceId: workspace.id,
        name: workspace.name,
        dateCreated: workspace.dateCreated,
        dateUpdated: workspace.dateUpdated
      },
      message: `Permanently deleted workspace **${workspace.name}** and all its contents.`
    };
  })
  .build();
