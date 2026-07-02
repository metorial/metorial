import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageProject = SlateTool.create(spec, {
  name: 'Manage Project',
  key: 'manage_project',
  description: `Create, update, or delete a project within a team. Projects organize team videos and can optionally have task workflows enabled.`,
  instructions: [
    'To create: provide teamSlug, name, and slug.',
    'To update: provide teamSlug, projectSlug, and the fields to change.',
    'To delete: provide teamSlug, projectSlug, and set "remove" to true.'
  ]
})
  .input(
    z.object({
      teamSlug: z.string().describe('Team slug'),
      projectSlug: z.string().optional().describe('Project slug (required for update/delete)'),
      remove: z.boolean().optional().describe('Set to true to delete the project'),
      name: z.string().optional().describe('Project name (required for creation)'),
      slug: z.string().optional().describe('Project slug (required for creation)'),
      description: z.string().optional().describe('Project description'),
      guidelines: z.string().optional().describe('Project guidelines')
    })
  )
  .output(
    z.object({
      name: z.string().optional().describe('Project name'),
      projectSlug: z.string().optional().describe('Project slug'),
      description: z.string().optional().describe('Project description'),
      guidelines: z.string().optional().describe('Project guidelines'),
      workflowEnabled: z.boolean().optional().describe('Whether task workflow is enabled'),
      created: z.string().optional().describe('Creation date'),
      modified: z.string().optional().describe('Last modified date'),
      removed: z.boolean().describe('Whether the project was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      username: ctx.auth.username
    });

    if (ctx.input.remove && ctx.input.projectSlug) {
      await client.deleteProject(ctx.input.teamSlug, ctx.input.projectSlug);
      return {
        output: { removed: true },
        message: `Deleted project \`${ctx.input.projectSlug}\` from team \`${ctx.input.teamSlug}\`.`
      };
    }

    if (ctx.input.projectSlug) {
      let project = await client.updateProject(ctx.input.teamSlug, ctx.input.projectSlug, {
        name: ctx.input.name,
        description: ctx.input.description,
        guidelines: ctx.input.guidelines
      });
      return {
        output: {
          name: project.name,
          projectSlug: project.slug,
          description: project.description,
          guidelines: project.guidelines,
          workflowEnabled: project.workflow_enabled,
          created: project.created,
          modified: project.modified,
          removed: false
        },
        message: `Updated project **"${project.name}"** (\`${project.slug}\`) in team \`${ctx.input.teamSlug}\`.`
      };
    }

    if (!ctx.input.name || !ctx.input.slug) {
      throw new Error('name and slug are required when creating a new project');
    }

    let project = await client.createProject(ctx.input.teamSlug, {
      name: ctx.input.name,
      slug: ctx.input.slug,
      description: ctx.input.description,
      guidelines: ctx.input.guidelines
    });

    return {
      output: {
        name: project.name,
        projectSlug: project.slug,
        description: project.description,
        guidelines: project.guidelines,
        workflowEnabled: project.workflow_enabled,
        created: project.created,
        modified: project.modified,
        removed: false
      },
      message: `Created project **"${project.name}"** (\`${project.slug}\`) in team \`${ctx.input.teamSlug}\`.`
    };
  })
  .build();
