import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageProject = SlateTool.create(spec, {
  name: 'Manage Project',
  key: 'manage_project',
  description: `Create, archive, restore, or delete a tracking project. Projects are top-level containers that group keywords, domains, and tracking settings. Use **create** to set up a new project, **archive** to deactivate it, **restore** to reactivate an archived project, or **delete** to permanently remove it.`,
  instructions: [
    'Use action "create" with a projectName and optional currencyCode to create a new project.',
    'Use action "archive", "restore", or "delete" with the projectName of an existing project.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'archive', 'restore', 'delete'])
        .describe('Action to perform on the project'),
      projectName: z.string().describe('Name of the project (used as identifier)'),
      currencyCode: z
        .string()
        .optional()
        .describe('3-letter currency code (e.g., "USD"). Only used when creating a project.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      projectId: z.string().nullable().describe('Project identifier (available for create)'),
      projectName: z.string().nullable().describe('Name of the project'),
      rawResponse: z.any().optional().describe('Raw API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, projectName, currencyCode } = ctx.input;

    let result: any;
    let message: string;

    switch (action) {
      case 'create':
        result = await client.createProject({ name: projectName, currencyCode });
        message = `Created project **${projectName}**.`;
        break;
      case 'archive':
        result = await client.archiveProject(projectName);
        message = `Archived project **${projectName}**.`;
        break;
      case 'restore':
        result = await client.restoreProject(projectName);
        message = `Restored project **${projectName}**.`;
        break;
      case 'delete':
        result = await client.deleteProject(projectName);
        message = `Deleted project **${projectName}**.`;
        break;
    }

    return {
      output: {
        success: true,
        projectId: result?.project_id ? String(result.project_id) : null,
        projectName: result?.category ?? projectName,
        rawResponse: result
      },
      message
    };
  })
  .build();
