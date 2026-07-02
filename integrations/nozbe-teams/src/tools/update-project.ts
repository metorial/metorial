import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateProject = SlateTool.create(spec, {
  name: 'Update Project',
  key: 'update_project',
  description: `Update an existing project in Nozbe Teams. Modify name, description, color, visibility, favorite status, and other project settings. Only provided fields will be updated.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to update'),
      name: z.string().optional().describe('New project name (1-255 characters)'),
      description: z
        .string()
        .nullable()
        .optional()
        .describe('New project description (set to null to clear)'),
      color: z.string().nullable().optional().describe('New project color'),
      isOpen: z
        .boolean()
        .optional()
        .describe('Whether the project is open to all space members'),
      isFavorite: z.boolean().optional().describe('Whether the project is favorited'),
      endedAt: z
        .number()
        .nullable()
        .optional()
        .describe('Set ended timestamp to archive the project, or null to unarchive')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('ID of the updated project'),
      name: z.string().describe('Updated project name'),
      description: z.string().nullable().optional().describe('Updated description'),
      color: z.string().nullable().optional().describe('Updated color'),
      isOpen: z.boolean().optional().describe('Updated open status'),
      isFavorite: z.boolean().optional().describe('Updated favorite status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data: Record<string, unknown> = {};
    if (ctx.input.name !== undefined) data.name = ctx.input.name;
    if (ctx.input.description !== undefined) data.description = ctx.input.description;
    if (ctx.input.color !== undefined) data.color = ctx.input.color;
    if (ctx.input.isOpen !== undefined) data.is_open = ctx.input.isOpen;
    if (ctx.input.isFavorite !== undefined) data.is_favorite = ctx.input.isFavorite;
    if (ctx.input.endedAt !== undefined) data.ended_at = ctx.input.endedAt;

    let project = await client.updateProject(ctx.input.projectId, data);

    return {
      output: {
        projectId: project.id,
        name: project.name,
        description: project.description,
        color: project.color,
        isOpen: project.is_open,
        isFavorite: project.is_favorite
      },
      message: `Updated project **${project.name}** (ID: ${project.id}).`
    };
  })
  .build();
