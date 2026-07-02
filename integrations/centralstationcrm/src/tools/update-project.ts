import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateProject = SlateTool.create(spec, {
  name: 'Update Project',
  key: 'update_project',
  description: `Update an existing project in CentralStationCRM. Modify the name, description, or responsible user.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      projectId: z.number().describe('ID of the project to update'),
      projectName: z.string().optional().describe('Updated project name'),
      description: z.string().optional().describe('Updated description'),
      responsibleUserId: z.number().optional().describe('ID of the new responsible user')
    })
  )
  .output(
    z.object({
      projectId: z.number().describe('ID of the updated project'),
      projectName: z.string().optional().describe('Project name'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountName: ctx.config.accountName
    });

    let data: Record<string, unknown> = {};
    if (ctx.input.projectName !== undefined) data.name = ctx.input.projectName;
    if (ctx.input.description !== undefined) data.description = ctx.input.description;
    if (ctx.input.responsibleUserId !== undefined) data.user_id = ctx.input.responsibleUserId;

    let result = await client.updateProject(ctx.input.projectId, data);
    let project = result?.project ?? result;

    return {
      output: {
        projectId: project.id,
        projectName: project.name,
        updatedAt: project.updated_at
      },
      message: `Updated project **${project.name}** (ID: ${project.id}).`
    };
  })
  .build();
