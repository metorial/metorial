import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { BugsnagClient } from '../lib/client';
import { spec } from '../spec';

export let manageProject = SlateTool.create(spec, {
  name: 'Manage Project',
  key: 'manage_project',
  description: `Create, update, or delete a Bugsnag project. Update its name, grouping, or discarded-event settings. Deleting a project permanently removes its data.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('The operation to perform'),
      organizationId: z.string().optional().describe('Organization ID (required for create)'),
      projectId: z.string().optional().describe('Project ID (required for update and delete)'),
      name: z
        .string()
        .optional()
        .describe('Project name (required for create, optional for update)'),
      type: z
        .string()
        .optional()
        .describe('Project platform type, e.g. js, ruby, python, android, ios (for create)'),
      releaseStages: z
        .array(z.string())
        .optional()
        .describe(
          'Legacy field: release stages are derived from reported events and cannot be changed by this API'
        ),
      globalGrouping: z
        .array(z.string())
        .optional()
        .describe('Global grouping rules (for update)'),
      locationGrouping: z
        .array(z.string())
        .optional()
        .describe('Location grouping rules (for update)'),
      discardedAppVersions: z
        .array(z.string())
        .optional()
        .describe('App versions to discard (for update)'),
      discardedErrors: z
        .array(z.string())
        .optional()
        .describe('Error classes to discard (for update)')
    })
  )
  .output(
    z.object({
      projectId: z.string().optional().describe('ID of the affected project'),
      name: z.string().optional().describe('Name of the project'),
      type: z.string().optional().describe('Project platform type'),
      apiKey: z.string().optional().describe('Project API key'),
      deleted: z.boolean().optional().describe('Whether the project was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BugsnagClient(ctx.auth);
    let { action } = ctx.input;

    if (action !== 'delete' && ctx.input.releaseStages !== undefined)
      throw createApiServiceError(
        'Release stages are derived from reported events and cannot be updated through the Data Access API.',
        { reason: 'unsupported_parameter' }
      );

    if (action === 'create') {
      let orgId = ctx.input.organizationId || ctx.config.organizationId;
      if (!orgId)
        throw createApiServiceError('Organization ID is required for creating a project.');
      if (!ctx.input.name?.trim()) throw createApiServiceError('Project name is required.');

      let project = await client.createProject(orgId, {
        name: ctx.input.name,
        type: ctx.input.type || 'other'
      });

      return {
        output: {
          projectId: project.id ?? undefined,
          name: project.name ?? undefined,
          type: project.type ?? undefined,
          apiKey: project.api_key ?? undefined
        },
        message: `Created project **${project.name}** with ID \`${project.id}\`.`
      };
    }

    if (action === 'update') {
      let projectId = ctx.input.projectId || ctx.config.projectId;
      if (!projectId)
        throw createApiServiceError('Project ID is required for updating a project.');

      let updateData: Record<string, unknown> = {};
      if (ctx.input.name !== undefined) {
        if (!ctx.input.name.trim())
          throw createApiServiceError('Project name must not be blank.');
        updateData.name = ctx.input.name;
      }
      if (ctx.input.globalGrouping) updateData.global_grouping = ctx.input.globalGrouping;
      if (ctx.input.locationGrouping)
        updateData.location_grouping = ctx.input.locationGrouping;
      if (ctx.input.discardedAppVersions)
        updateData.discarded_app_versions = ctx.input.discardedAppVersions;
      if (ctx.input.discardedErrors) updateData.discarded_errors = ctx.input.discardedErrors;
      if (!Object.keys(updateData).length)
        throw createApiServiceError('Supply at least one project setting to update.');

      let project = await client.updateProject(projectId, updateData);

      return {
        output: {
          projectId: project.id ?? undefined,
          name: project.name ?? undefined,
          type: project.type ?? undefined,
          apiKey: project.api_key ?? undefined
        },
        message: `Updated project **${project.name}**.`
      };
    }

    if (action === 'delete') {
      let projectId = ctx.input.projectId || ctx.config.projectId;
      if (!projectId)
        throw createApiServiceError('Project ID is required for deleting a project.');

      await client.deleteProject(projectId);

      return {
        output: {
          projectId,
          deleted: true
        },
        message: `Deleted project \`${projectId}\`.`
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
