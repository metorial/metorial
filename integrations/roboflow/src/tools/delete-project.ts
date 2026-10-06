import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { projectIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export const deleteProjectTool = SlateTool.create(spec, {
  name: 'Move Project to Trash',
  key: 'delete_project',
  description:
    'Move a project to Trash, hiding it from the workspace and cancelling its in-flight training jobs. Roboflow retains it for 30 days and allows restoration from Trash during that period. Call list_projects to discover projects.',
  tags: { destructive: true }
})
  .input(z.object({ projectId: projectIdSchema }))
  .output(z.object({ projectId: z.string(), deleted: z.boolean() }))
  .handleInvocation(async ctx => {
    const client = createClient(ctx.auth, ctx.config);
    const result = await client.deleteProject(
      await client.getWorkspaceId(),
      ctx.input.projectId
    );
    if (result.deleted !== true) {
      throw createApiServiceError(
        'Roboflow did not confirm that the project was moved to Trash.'
      );
    }
    return {
      output: { projectId: ctx.input.projectId, deleted: true },
      message: `Moved project **${ctx.input.projectId}** to Trash.`
    };
  })
  .build();
