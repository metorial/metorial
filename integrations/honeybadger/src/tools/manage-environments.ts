import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { HoneybadgerClient } from '../lib/client';
import type { Environment } from '../lib/types';
import { nextUrlSchema, projectIdSchema, requireUpdate } from '../lib/validation';
import { spec } from '../spec';

let environmentSchema = z.object({
  environmentId: z.number().describe('Environment ID'),
  projectId: z.number().optional().describe('Project ID'),
  name: z.string().optional().describe('Environment name'),
  notifications: z.boolean().optional().describe('Whether notifications are enabled'),
  createdAt: z.string().optional().describe('When the environment was created')
});

export let manageEnvironments = SlateTool.create(spec, {
  name: 'Manage Environments',
  key: 'manage_environments',
  description: `List, create, update, or delete environments within a Honeybadger project. Environments organize error data and monitoring by deployment context (e.g., production, staging, development).`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      nextUrl: nextUrlSchema,
      action: z
        .enum(['list', 'create', 'update', 'delete', 'get'])
        .describe('Action to perform'),
      projectId: projectIdSchema,
      environmentId: z
        .string()
        .optional()
        .describe('Environment ID (required for update and delete)'),
      name: z.string().optional().describe('Environment name (required for create)'),
      notifications: z
        .boolean()
        .optional()
        .describe('Enable/disable notifications for this environment')
    })
  )
  .output(
    z.object({
      nextUrl: z
        .string()
        .optional()
        .describe('Next-page URL, when another page may be available'),
      environments: z.array(environmentSchema).optional().describe('List of environments'),
      environment: environmentSchema.optional().describe('Created or updated environment'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HoneybadgerClient(ctx.auth);
    let { action, projectId, environmentId, name, notifications } = ctx.input;

    let mapEnv = (e: Environment) => ({
      environmentId: e.id ?? undefined,
      projectId: e.project_id ?? undefined,
      name: e.name ?? undefined,
      notifications: e.notifications ?? undefined,
      createdAt: e.created_at ?? undefined
    });

    switch (action) {
      case 'list': {
        let data = await client.listEnvironments(projectId, ctx.input.nextUrl);
        let environments = (data.results || []).map(mapEnv);
        return {
          output: { environments, nextUrl: data.links?.next ?? undefined, success: true },
          message: `Found **${environments.length}** environment(s).`
        };
      }

      case 'create': {
        if (!name) throw createApiServiceError('name is required for create action');
        let created = await client.createEnvironment(projectId, { name, notifications });
        return {
          output: { environment: mapEnv(created), success: true },
          message: `Created environment **${created.name}**.`
        };
      }

      case 'update': {
        if (!environmentId)
          throw createApiServiceError('environmentId is required for update action');
        requireUpdate(name, notifications);
        await client.updateEnvironment(projectId, environmentId, { name, notifications });
        return {
          output: { success: true },
          message: `Updated environment **${environmentId}**.`
        };
      }

      case 'delete': {
        if (!environmentId)
          throw createApiServiceError('environmentId is required for delete action');
        await client.deleteEnvironment(projectId, environmentId);
        return {
          output: { success: true },
          message: `Deleted environment **${environmentId}**.`
        };
      }

      case 'get': {
        if (!environmentId) throw createApiServiceError('environmentId is required for get.');
        const environment = await client.getEnvironment(projectId, environmentId);
        return {
          output: { environment: mapEnv(environment), success: true },
          message: 'Retrieved the environment.'
        };
      }
      default:
        throw createApiServiceError(`Unknown action: ${action}`);
    }
  })
  .build();
