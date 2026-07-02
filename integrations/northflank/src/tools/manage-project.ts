import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageProject = SlateTool.create(spec, {
  name: 'Manage Project',
  key: 'manage_project',
  description: `Create, update, delete, or retrieve a Northflank project. Projects are the top-level container for services, jobs, addons, and secrets.`,
  instructions: [
    'To create a project, set action to "create" and provide a name. Optionally specify a region or clusterId for BYOC.',
    'To get project details, set action to "get" and provide the projectId.',
    'To update, set action to "update" with projectId and the fields to change.',
    'To delete, set action to "delete" with the projectId.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'update', 'delete']).describe('Operation to perform'),
      projectId: z
        .string()
        .optional()
        .describe('Project ID (required for get, update, delete)'),
      name: z
        .string()
        .optional()
        .describe('Project name (required for create, optional for update)'),
      description: z.string().optional().describe('Project description'),
      color: z.string().optional().describe('Project color as hex code (e.g. #FF0000)'),
      region: z.string().optional().describe('Hosting region identifier (for create)'),
      clusterId: z
        .string()
        .optional()
        .describe('BYOC cluster ID (for create, alternative to region)')
    })
  )
  .output(
    z.object({
      projectId: z.string().optional().describe('Project ID'),
      name: z.string().optional().describe('Project name'),
      description: z.string().optional().describe('Project description'),
      deleted: z.boolean().optional().describe('Whether the project was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      teamId: ctx.config.teamId
    });

    let { action, projectId, name, description, color, region, clusterId } = ctx.input;

    if (action === 'create') {
      if (!name) throw new Error('name is required for creating a project');
      let result = await client.createProject({ name, description, color, region, clusterId });
      return {
        output: {
          projectId: result?.id,
          name: result?.name,
          description: result?.description
        },
        message: `Project **${name}** created successfully.`
      };
    }

    if (action === 'get') {
      if (!projectId) throw new Error('projectId is required');
      let result = await client.getProject(projectId);
      return {
        output: {
          projectId: result?.id,
          name: result?.name,
          description: result?.description
        },
        message: `Retrieved project **${result?.name}** (${projectId}).`
      };
    }

    if (action === 'update') {
      if (!projectId) throw new Error('projectId is required for update');
      let result = await client.updateProject(projectId, { name, description, color });
      return {
        output: {
          projectId: result?.id || projectId,
          name: result?.name,
          description: result?.description
        },
        message: `Project **${projectId}** updated successfully.`
      };
    }

    if (action === 'delete') {
      if (!projectId) throw new Error('projectId is required for delete');
      await client.deleteProject(projectId);
      return {
        output: {
          projectId,
          deleted: true
        },
        message: `Project **${projectId}** deleted.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
