import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listWorkspaces = SlateTool.create(spec, {
  name: 'List Workspaces',
  key: 'list_workspaces',
  description: `List all workspaces within an organization. Workspaces are logical project containers where documents are processed. Optionally filter by name.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      organizationIdentifier: z
        .string()
        .describe('Organization identifier to list workspaces for.'),
      name: z.string().optional().describe('Filter workspaces by name.')
    })
  )
  .output(
    z.object({
      workspaces: z
        .array(
          z.object({
            workspaceIdentifier: z.string().describe('Unique identifier of the workspace.'),
            name: z.string().optional().describe('Name of the workspace.'),
            organizationIdentifier: z
              .string()
              .optional()
              .describe('Organization this workspace belongs to.'),
            documentCount: z
              .number()
              .optional()
              .describe('Number of documents in the workspace.')
          })
        )
        .describe('List of workspaces.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.listWorkspaces(ctx.input.organizationIdentifier, ctx.input.name);
    let workspaces = (Array.isArray(result) ? result : (result.results ?? [])).map(
      (ws: any) => ({
        workspaceIdentifier: ws.identifier ?? '',
        name: ws.name,
        organizationIdentifier: ws.organization?.identifier,
        documentCount: ws.documentCount
      })
    );

    return {
      output: { workspaces },
      message: `Found **${workspaces.length}** workspace(s).`
    };
  })
  .build();

export let createWorkspace = SlateTool.create(spec, {
  name: 'Create Workspace',
  key: 'create_workspace',
  description: `Create a new workspace within an organization. A workspace is a logical container for document processing that can have its own configuration, document types, and access permissions.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      organizationIdentifier: z.string().describe('Organization to create the workspace in.'),
      name: z.string().describe('Name for the new workspace.')
    })
  )
  .output(
    z.object({
      workspaceIdentifier: z.string().describe('Unique identifier of the created workspace.'),
      name: z.string().optional().describe('Name of the created workspace.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.createWorkspace({
      organization: ctx.input.organizationIdentifier,
      name: ctx.input.name
    });

    return {
      output: {
        workspaceIdentifier: result.identifier ?? '',
        name: result.name
      },
      message: `Workspace **${result.name}** created with identifier \`${result.identifier}\`.`
    };
  })
  .build();

export let deleteWorkspace = SlateTool.create(spec, {
  name: 'Delete Workspace',
  key: 'delete_workspace',
  description: `Permanently delete a workspace and all its contents. This removes the workspace, its collections, and all documents within it. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      workspaceIdentifier: z.string().describe('Identifier of the workspace to delete.')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the workspace was successfully deleted.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    await client.deleteWorkspace(ctx.input.workspaceIdentifier);

    return {
      output: { deleted: true },
      message: `Workspace \`${ctx.input.workspaceIdentifier}\` has been permanently deleted.`
    };
  })
  .build();
