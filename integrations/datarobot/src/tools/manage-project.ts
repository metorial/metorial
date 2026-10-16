import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { DataRobotClient } from '../lib/client';
import { parseOutput } from '../lib/output';
import { spec } from '../spec';

let outputSchema = z.object({
  success: z.boolean().describe('Whether the operation succeeded'),
  projectId: z.string().describe('ID of the affected project'),
  projectName: z.string().optional().describe('Updated project name')
});

export let manageProject = SlateTool.create(spec, {
  name: 'Update or Delete Project',
  key: 'manage_project',
  description: `Update a project's name or delete a project entirely. Use action "update" to rename, or "delete" to soft-delete the project.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project'),
      action: z.enum(['update', 'delete']).describe('Action to perform'),
      projectName: z
        .string()
        .optional()
        .describe('New name for the project (required for update)')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let client = new DataRobotClient({
      token: ctx.auth.token,
      endpointUrl: ctx.auth.endpointUrl ?? ctx.config.endpointUrl
    });

    if (ctx.input.action === 'delete') {
      await client.deleteProject(ctx.input.projectId);
      return {
        output: parseOutput(outputSchema, {
          success: true,
          projectId: ctx.input.projectId
        }),
        message: `Project **${ctx.input.projectId}** has been deleted.`
      };
    }

    if (!ctx.input.projectName?.trim()) {
      throw createApiServiceError('Provide projectName to rename the project.');
    }
    let updated = await client.updateProject(ctx.input.projectId, {
      projectName: ctx.input.projectName
    });

    return {
      output: parseOutput(outputSchema, {
        success: true,
        projectId: ctx.input.projectId,
        projectName: updated.projectName
      }),
      message: `Project renamed to **${ctx.input.projectName}**.`
    };
  })
  .build();
