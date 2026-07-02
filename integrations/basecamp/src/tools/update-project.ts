import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateProjectTool = SlateTool.create(spec, {
  name: 'Update Project',
  key: 'update_project',
  description: `Update a Basecamp project's name or description. You can also trash a project to mark it for deletion (auto-deleted after 30 days).`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to update'),
      name: z.string().optional().describe('New name for the project'),
      description: z
        .string()
        .optional()
        .describe('New description for the project (supports HTML)'),
      trash: z
        .boolean()
        .optional()
        .describe('Set to true to trash the project (auto-deleted after 30 days)')
    })
  )
  .output(
    z.object({
      projectId: z.number().describe('ID of the updated project'),
      name: z.string().describe('Updated name of the project'),
      description: z.string().nullable().describe('Updated description'),
      trashed: z.boolean().describe('Whether the project was trashed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    if (ctx.input.trash) {
      await client.trashProject(ctx.input.projectId);
      return {
        output: {
          projectId: Number(ctx.input.projectId),
          name: '',
          description: null,
          trashed: true
        },
        message: `Trashed project **${ctx.input.projectId}**. It will be permanently deleted after 30 days.`
      };
    }

    let updateData: Record<string, any> = {};
    if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
    if (ctx.input.description !== undefined) updateData.description = ctx.input.description;

    let project = await client.updateProject(ctx.input.projectId, updateData);

    return {
      output: {
        projectId: project.id,
        name: project.name,
        description: project.description ?? null,
        trashed: false
      },
      message: `Updated project **${project.name}**.`
    };
  })
  .build();
