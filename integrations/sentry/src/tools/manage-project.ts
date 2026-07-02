import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageProjectTool = SlateTool.create(spec, {
  name: 'Manage Project',
  key: 'manage_project',
  description: `Create, update, or delete a Sentry project. When creating, a team slug is required. When updating, provide the project slug and the fields to change.`,
  instructions: [
    'To create: provide teamSlug, name, and optionally platform and slug',
    'To update: provide projectSlug and any fields to update (name, slug, platform)',
    'To delete: provide projectSlug and set action to "delete"'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      projectSlug: z.string().optional().describe('Project slug (required for update/delete)'),
      teamSlug: z.string().optional().describe('Team slug (required for create)'),
      name: z.string().optional().describe('Project name'),
      slug: z.string().optional().describe('Project slug to set'),
      platform: z
        .string()
        .optional()
        .describe('Platform identifier (e.g. "python", "javascript", "node")')
    })
  )
  .output(
    z.object({
      projectId: z.string().optional(),
      projectSlug: z.string().optional(),
      name: z.string().optional(),
      platform: z.string().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.action === 'create') {
      if (!ctx.input.teamSlug) throw new Error('teamSlug is required when creating a project');
      if (!ctx.input.name) throw new Error('name is required when creating a project');

      let project = await client.createProject(ctx.input.teamSlug, {
        name: ctx.input.name,
        slug: ctx.input.slug,
        platform: ctx.input.platform
      });

      return {
        output: {
          projectId: String(project.id),
          projectSlug: project.slug,
          name: project.name,
          platform: project.platform
        },
        message: `Created project **${project.slug}** in team ${ctx.input.teamSlug}.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.projectSlug)
        throw new Error('projectSlug is required when updating a project');

      let updateData: Record<string, any> = {};
      if (ctx.input.name) updateData.name = ctx.input.name;
      if (ctx.input.slug) updateData.slug = ctx.input.slug;
      if (ctx.input.platform) updateData.platform = ctx.input.platform;

      let project = await client.updateProject(ctx.input.projectSlug, updateData);

      return {
        output: {
          projectId: String(project.id),
          projectSlug: project.slug,
          name: project.name,
          platform: project.platform
        },
        message: `Updated project **${project.slug}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.projectSlug)
        throw new Error('projectSlug is required when deleting a project');

      await client.deleteProject(ctx.input.projectSlug);

      return {
        output: {
          projectSlug: ctx.input.projectSlug,
          deleted: true
        },
        message: `Deleted project **${ctx.input.projectSlug}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
