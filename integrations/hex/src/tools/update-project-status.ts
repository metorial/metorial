import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateProjectStatus = SlateTool.create(spec, {
  name: 'Update Project Status',
  key: 'update_project_status',
  description: `Add or remove a status (including endorsements) from a Hex project. Set status to null to remove the current status.`
})
  .input(
    z.object({
      projectId: z.string().describe('UUID of the project to update'),
      status: z
        .string()
        .nullable()
        .describe('Status to set on the project, or null to remove the current status')
    })
  )
  .output(
    z.object({
      projectId: z.string(),
      title: z.string(),
      status: z.string().nullable(),
      updatedAt: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    let project = await client.updateProjectStatus(ctx.input.projectId, ctx.input.status);

    return {
      output: {
        projectId: project.projectId,
        title: project.title,
        status: project.status,
        updatedAt: project.updatedAt
      },
      message: ctx.input.status
        ? `Set status **${ctx.input.status}** on project **${project.title}**.`
        : `Removed status from project **${project.title}**.`
    };
  })
  .build();
