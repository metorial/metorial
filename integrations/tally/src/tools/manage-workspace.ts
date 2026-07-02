import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createWorkspace = SlateTool.create(spec, {
  name: 'Create Workspace',
  key: 'create_workspace',
  description: `Create a new Tally workspace for grouping related forms. Requires a Pro subscription.`,
  constraints: ['Requires a Tally Pro subscription.']
})
  .input(
    z.object({
      name: z.string().describe('Name for the new workspace')
    })
  )
  .output(
    z.object({
      workspaceId: z.string().describe('Unique workspace identifier'),
      name: z.string().describe('Workspace name'),
      createdAt: z.string().describe('ISO 8601 creation timestamp'),
      updatedAt: z.string().describe('ISO 8601 last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let workspace = await client.createWorkspace({ name: ctx.input.name });

    return {
      output: {
        workspaceId: workspace.id,
        name: workspace.name,
        createdAt: workspace.createdAt,
        updatedAt: workspace.updatedAt
      },
      message: `Created workspace **"${workspace.name}"** (${workspace.id}).`
    };
  })
  .build();

export let deleteWorkspace = SlateTool.create(spec, {
  name: 'Delete Workspace',
  key: 'delete_workspace',
  description: `Delete a Tally workspace and move it along with its forms to the trash.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      workspaceId: z.string().describe('The workspace ID to delete')
    })
  )
  .output(
    z.object({
      workspaceId: z.string().describe('ID of the deleted workspace'),
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteWorkspace(ctx.input.workspaceId);

    return {
      output: {
        workspaceId: ctx.input.workspaceId,
        deleted: true
      },
      message: `Workspace **${ctx.input.workspaceId}** has been moved to trash.`
    };
  })
  .build();
