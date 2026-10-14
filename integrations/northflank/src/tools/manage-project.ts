import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { teamIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let manageProject = SlateTool.create(spec, {
  name: 'Manage Project',
  key: 'manage_project',
  description: `Create, update, delete, or retrieve a Northflank project. Projects are the top-level container for services, jobs, addons, and secrets.`,
  instructions: [
    'To create a project, set action to "create" and provide a name. Optionally specify a region or clusterId for BYOC.',
    'To get project details, set action to "get" and provide the projectId.',
    'To update, set action to "update" with projectId and a description or color. Project names cannot be changed.',
    'To delete, set action to "delete" with the projectId.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      teamId: teamIdSchema,
      action: z.enum(['create', 'get', 'update', 'delete']).describe('Operation to perform'),
      projectId: z
        .string()
        .optional()
        .describe('Project ID (required for get, update, delete)'),
      name: z
        .string()
        .optional()
        .describe('Project name (required for create; names cannot be changed on update)'),
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
      teamId:
        ctx.input.teamId ??
        (typeof ctx.config.teamId === 'string' ? ctx.config.teamId : undefined)
    });

    let { action, projectId, name, description, color, region, clusterId } = ctx.input;

    if (action === 'create') {
      if (!name) throw createApiServiceError('name is required for creating a project');
      if (region && clusterId)
        throw createApiServiceError('Provide either region or clusterId, not both.');
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
      if (!projectId) throw createApiServiceError('projectId is required');
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
      if (!projectId) throw createApiServiceError('projectId is required for update');
      if (name !== undefined)
        throw createApiServiceError(
          'Project names cannot be changed. Update description or color instead.'
        );
      let result = await client.updateProject(projectId, { description, color });
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
      if (!projectId) throw createApiServiceError('projectId is required for delete');
      await client.deleteProject(projectId);
      return {
        output: {
          projectId,
          deleted: true
        },
        message: `Project **${projectId}** deleted.`
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
