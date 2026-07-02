import { SlateTool } from 'slates';
import { z } from 'zod';
import { HoneybadgerClient } from '../lib/client';
import { spec } from '../spec';

export let manageProject = SlateTool.create(spec, {
  name: 'Manage Project',
  key: 'manage_project',
  description: `Create, update, or delete a Honeybadger project. Use **create** to set up a new project (requires an account ID), **update** to modify an existing project's settings, or **delete** to remove a project.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete'])
        .describe('Action to perform on the project'),
      projectId: z.string().optional().describe('Project ID (required for update and delete)'),
      accountId: z.string().optional().describe('Account ID (required for create)'),
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
      projectToken: z.string().optional().describe('Project API key'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HoneybadgerClient({ token: ctx.auth.token });
    let {
      action,
      projectId,
      accountId,
      name,
      language,
      resolveErrorsOnDeploy,
      disablePublicLinks
    } = ctx.input;

    if (action === 'create') {
      if (!accountId || !name) {
        throw new Error('accountId and name are required for creating a project');
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
          projectToken: result.token,
          success: true
        },
        message: `Created project **${result.name}** (ID: ${result.id}).`
      };
    }

    if (action === 'update') {
      if (!projectId) {
        throw new Error('projectId is required for updating a project');
      }
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
        throw new Error('projectId is required for deleting a project');
      }
      await client.deleteProject(projectId);
      return {
        output: { success: true },
        message: `Deleted project **${projectId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
