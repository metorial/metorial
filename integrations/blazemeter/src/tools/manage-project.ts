import { SlateTool } from 'slates';
import { z } from 'zod';
import { BlazeMeterClient } from '../lib/client';
import { spec } from '../spec';

export let manageProject = SlateTool.create(spec, {
  name: 'Manage Project',
  key: 'manage_project',
  description: `Create, update, delete, or list projects in a BlazeMeter workspace. Projects are containers for organizing tests within workspaces.`,
  instructions: [
    'Use "list" with a **workspaceId** to see all projects.',
    'Use "create" with **workspaceId** and **name** to create a new project.',
    'Use "update" with **projectId** and **name** to rename.',
    'Use "delete" with **projectId** to remove a project.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Operation to perform'),
      workspaceId: z.number().optional().describe('Workspace ID (required for list/create)'),
      projectId: z.number().optional().describe('Project ID (required for update/delete)'),
      name: z.string().optional().describe('Project name (required for create/update)')
    })
  )
  .output(
    z.object({
      projects: z
        .array(
          z.object({
            projectId: z.number().describe('Project ID'),
            name: z.string().describe('Project name'),
            workspaceId: z.number().optional().describe('Workspace ID'),
            created: z.number().optional().describe('Creation timestamp'),
            updated: z.number().optional().describe('Last update timestamp')
          })
        )
        .optional()
        .describe('List of projects (for list action)'),
      projectId: z.number().optional().describe('Project ID (for create/update)'),
      name: z.string().optional().describe('Project name'),
      deleted: z.boolean().optional().describe('Whether the project was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BlazeMeterClient({
      token: ctx.auth.token,
      apiKeyId: ctx.auth.apiKeyId,
      apiKeySecret: ctx.auth.apiKeySecret
    });

    if (ctx.input.action === 'list') {
      if (!ctx.input.workspaceId)
        throw new Error('workspaceId is required for listing projects');
      let projects = await client.listProjects(ctx.input.workspaceId);
      let mapped = projects.map((p: any) => ({
        projectId: p.id,
        name: p.name,
        workspaceId: p.workspaceId,
        created: p.created,
        updated: p.updated
      }));
      return {
        output: { projects: mapped },
        message: `Found **${mapped.length}** project(s) in workspace ${ctx.input.workspaceId}.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.workspaceId || !ctx.input.name) {
        throw new Error('workspaceId and name are required for creating a project');
      }
      let project = await client.createProject(ctx.input.workspaceId, ctx.input.name);
      return {
        output: { projectId: project.id, name: project.name },
        message: `Created project **${project.name}** (ID: ${project.id}).`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.projectId || !ctx.input.name) {
        throw new Error('projectId and name are required for updating a project');
      }
      let project = await client.updateProject(ctx.input.projectId, ctx.input.name);
      return {
        output: { projectId: project.id, name: project.name },
        message: `Updated project to **${project.name}** (ID: ${project.id}).`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.projectId)
        throw new Error('projectId is required for deleting a project');
      await client.deleteProject(ctx.input.projectId);
      return {
        output: { projectId: ctx.input.projectId, deleted: true },
        message: `Deleted project with ID: ${ctx.input.projectId}.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
