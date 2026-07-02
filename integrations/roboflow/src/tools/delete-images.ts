import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let deleteImagesTool = SlateTool.create(spec, {
  name: 'Delete Images',
  key: 'delete_images',
  description: `Delete one or more images from a Roboflow project. This permanently removes the images and their annotations from the project.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('Project URL slug'),
      imageIds: z.array(z.string()).min(1).describe('List of image IDs to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful'),
      deletedCount: z.number().describe('Number of images deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let workspaceId = await client.getWorkspaceId();

    await client.deleteImages(workspaceId, ctx.input.projectId, ctx.input.imageIds);

    return {
      output: {
        success: true,
        deletedCount: ctx.input.imageIds.length
      },
      message: `Deleted **${ctx.input.imageIds.length}** image(s) from project **${ctx.input.projectId}**.`
    };
  })
  .build();
