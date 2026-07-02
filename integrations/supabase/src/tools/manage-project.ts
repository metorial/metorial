import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ManagementClient } from '../lib/client';
import { spec } from '../spec';

export let manageProject = SlateTool.create(spec, {
  name: 'Manage Project',
  key: 'manage_project',
  description: `Create, pause, restore, or delete a Supabase project. Use **create** to provision a new project with a database, **pause** to temporarily suspend it, **restore** to reactivate it, or **delete** to permanently remove it.`,
  instructions: [
    'When creating a project, you must provide organizationId, region, and dbPass.',
    'Deleting a project is irreversible — use with caution.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'pause', 'restore', 'delete']).describe('Action to perform'),
      projectRef: z
        .string()
        .optional()
        .describe('Project reference ID (required for pause, restore, delete)'),
      name: z.string().optional().describe('Project name (required for create)'),
      organizationId: z.string().optional().describe('Organization ID (required for create)'),
      region: z
        .string()
        .optional()
        .describe('Database region, e.g., us-east-1 (required for create)'),
      dbPass: z.string().optional().describe('Database password (required for create)'),
      plan: z.enum(['free', 'pro']).optional().describe('Project plan (defaults to free)')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('Project reference ID'),
      name: z.string().describe('Project name'),
      status: z.string().describe('Project status after the operation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ManagementClient(ctx.auth.token);
    let { action } = ctx.input;

    if (action === 'create') {
      if (
        !ctx.input.name ||
        !ctx.input.organizationId ||
        !ctx.input.region ||
        !ctx.input.dbPass
      ) {
        throw createApiServiceError(
          'name, organizationId, region, and dbPass are required for creating a project'
        );
      }

      let result = await client.createProject({
        name: ctx.input.name,
        organizationId: ctx.input.organizationId,
        region: ctx.input.region,
        dbPass: ctx.input.dbPass,
        plan: ctx.input.plan
      });

      return {
        output: {
          projectId: result.id ?? result.ref ?? '',
          name: result.name ?? ctx.input.name,
          status: result.status ?? 'COMING_UP'
        },
        message: `Created project **${ctx.input.name}** in region ${ctx.input.region}.`
      };
    }

    if (!ctx.input.projectRef) {
      throw createApiServiceError(
        'projectRef is required for pause, restore, and delete actions'
      );
    }

    if (action === 'pause') {
      await client.pauseProject(ctx.input.projectRef);
      return {
        output: {
          projectId: ctx.input.projectRef,
          name: '',
          status: 'PAUSED'
        },
        message: `Paused project **${ctx.input.projectRef}**.`
      };
    }

    if (action === 'restore') {
      await client.restoreProject(ctx.input.projectRef);
      return {
        output: {
          projectId: ctx.input.projectRef,
          name: '',
          status: 'RESTORING'
        },
        message: `Restoring project **${ctx.input.projectRef}**.`
      };
    }

    // delete
    await client.deleteProject(ctx.input.projectRef);
    return {
      output: {
        projectId: ctx.input.projectRef,
        name: '',
        status: 'DELETED'
      },
      message: `Deleted project **${ctx.input.projectRef}**.`
    };
  })
  .build();
