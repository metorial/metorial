import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { HoneybadgerClient } from '../lib/client';
import { accountIdSchema, projectIdSchema, requireUpdate } from '../lib/validation';
import { spec } from '../spec';

export let manageProject = SlateTool.create(spec, {
  name: 'Manage Project',
  key: 'manage_project',
  description: `Get details, create, update, or delete a Honeybadger project. Call list_accounts for account IDs and list_projects for project IDs. Use **create** to set up a new project (requires an account ID), **update** to modify an existing project's settings, or **delete** to remove a project.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete', 'get'])
        .describe('Action to perform on the project'),
      projectId: projectIdSchema.optional(),
      accountId: accountIdSchema.optional(),
      name: z.string().optional().describe('Project name (required for create)'),
      language: z
        .enum(['js', 'elixir', 'golang', 'java', 'node', 'php', 'python', 'ruby', 'other'])
        .optional()
        .describe('Primary programming language'),
      resolveErrorsOnDeploy: z
        .boolean()
        .optional()
        .describe('Auto-resolve errors when deploying'),
      disablePublicLinks: z.boolean().optional().describe('Disable public links to errors')
    })
  )
  .output(
    z.object({
      projectId: z.number().optional().describe('ID of the created/updated project'),
      name: z.string().optional().describe('Name of the project'),
      projectToken: z
        .string()
        .optional()
        .describe('Legacy field; credentials are not returned'),
      reportingKeyAvailable: z
        .boolean()
        .optional()
        .describe('Whether a primary reporting key exists'),
      resolveErrorsOnDeploy: z
        .boolean()
        .optional()
        .describe('Whether deployment reports resolve errors'),
      disablePublicLinks: z
        .boolean()
        .optional()
        .describe('Whether public error sharing is disabled'),
      streams: z
        .array(
          z.object({
            streamId: z.string(),
            name: z.string().optional(),
            slug: z.string().optional(),
            internal: z.boolean().optional()
          })
        )
        .optional()
        .describe('Insights streams for query_insights'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HoneybadgerClient(ctx.auth);
    let {
      action,
      projectId,
      accountId,
      name,
      language,
      resolveErrorsOnDeploy,
      disablePublicLinks
    } = ctx.input;

    if (action === 'get') {
      if (!projectId)
        throw createApiServiceError(
          'projectId is required for get. Call list_projects to discover IDs.'
        );
      const project = await client.getProject(projectId);
      return {
        output: {
          projectId: project.id,
          name: project.name,
          reportingKeyAvailable: Boolean(project.token),
          streams: project.streams?.map(stream => ({
            streamId: stream.id,
            name: stream.name ?? undefined,
            slug: stream.slug ?? undefined,
            internal: stream.internal ?? undefined
          })),
          resolveErrorsOnDeploy: project.resolve_errors_on_deploy ?? undefined,
          disablePublicLinks: project.disable_public_links ?? undefined,
          success: true
        },
        message: `Retrieved project **${project.name}**.`
      };
    }
    if (action === 'create') {
      if (!accountId || !name) {
        throw createApiServiceError('accountId and name are required for creating a project');
      }
      let result = await client.createProject(accountId, {
        name,
        language,
        resolveErrorsOnDeploy,
        disablePublicLinks
      });
      return {
        output: {
          projectId: result.id,
          name: result.name,
          reportingKeyAvailable: Boolean(result.token),
          success: true
        },
        message: `Created project **${result.name}** (ID: ${result.id}).`
      };
    }

    if (action === 'update') {
      if (!projectId) {
        throw createApiServiceError('projectId is required for updating a project');
      }
      requireUpdate(name, language, resolveErrorsOnDeploy, disablePublicLinks);
      await client.updateProject(projectId, {
        name,
        language,
        resolveErrorsOnDeploy,
        disablePublicLinks
      });
      return {
        output: {
          projectId: Number(projectId),
          name,
          success: true
        },
        message: `Updated project **${projectId}**.`
      };
    }

    if (action === 'delete') {
      if (!projectId) {
        throw createApiServiceError('projectId is required for deleting a project');
      }
      await client.deleteProject(projectId);
      return {
        output: { success: true },
        message: `Deleted project **${projectId}**.`
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
