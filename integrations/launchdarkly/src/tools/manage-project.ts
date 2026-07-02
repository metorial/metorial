import { SlateTool } from 'slates';
import { z } from 'zod';
import { LaunchDarklyClient } from '../lib/client';
import { spec } from '../spec';

export let manageProject = SlateTool.create(spec, {
  name: 'Manage Project',
  key: 'manage_project',
  description: `Create a new project or update an existing one in LaunchDarkly. When creating, provide a key and name. When updating, provide the project key and the fields to change (name, tags). To delete a project, use the delete action.`,
  instructions: [
    'To create a project, set action to "create" and provide projectKey and name.',
    'To update a project, set action to "update" and provide projectKey plus fields to change.',
    'To delete a project, set action to "delete" and provide projectKey.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      projectKey: z.string().describe('Project key'),
      name: z.string().optional().describe('Project name (required for create)'),
      tags: z.array(z.string()).optional().describe('Project tags'),
      environments: z
        .array(
          z.object({
            key: z.string().describe('Environment key'),
            name: z.string().describe('Environment name'),
            color: z.string().describe('Environment color hex code (e.g., "417505")')
          })
        )
        .optional()
        .describe('Initial environments (only for create)')
    })
  )
  .output(
    z.object({
      projectKey: z.string().describe('Project key'),
      name: z.string().optional().describe('Project name'),
      deleted: z.boolean().optional().describe('Whether the project was deleted'),
      environmentCount: z.number().optional().describe('Number of environments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LaunchDarklyClient(ctx.auth.token);
    let { action, projectKey } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.name) {
        throw new Error('name is required when creating a project.');
      }
      let project = await client.createProject({
        key: projectKey,
        name: ctx.input.name,
        tags: ctx.input.tags,
        environments: ctx.input.environments
      });

      return {
        output: {
          projectKey: project.key,
          name: project.name,
          environmentCount: (project.environments ?? []).length
        },
        message: `Created project **${project.name}** (\`${project.key}\`).`
      };
    }

    if (action === 'update') {
      let patches: Array<{ op: string; path: string; value: any }> = [];
      if (ctx.input.name !== undefined) {
        patches.push({ op: 'replace', path: '/name', value: ctx.input.name });
      }
      if (ctx.input.tags !== undefined) {
        patches.push({ op: 'replace', path: '/tags', value: ctx.input.tags });
      }
      if (patches.length === 0) {
        throw new Error('No fields to update. Provide name or tags.');
      }

      let project = await client.updateProject(projectKey, patches);

      return {
        output: {
          projectKey: project.key,
          name: project.name,
          environmentCount: (project.environments ?? []).length
        },
        message: `Updated project **${project.name}** (\`${project.key}\`).`
      };
    }

    // delete
    await client.deleteProject(projectKey);
    return {
      output: {
        projectKey,
        deleted: true
      },
      message: `Deleted project \`${projectKey}\`.`
    };
  })
  .build();
