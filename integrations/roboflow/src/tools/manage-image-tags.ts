import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageImageTagsTool = SlateTool.create(spec, {
  name: 'Manage Image Tags',
  key: 'manage_image_tags',
  description: `Add, remove, or set tags on a specific image in a project. Tags are used for organizing and filtering images. Use "add" to append tags, "remove" to delete specific tags, or "set" to replace all existing tags.`
})
  .input(
    z.object({
      projectId: z.string().describe('Project URL slug'),
      imageId: z.string().describe('Unique image identifier'),
      operation: z
        .enum(['add', 'remove', 'set'])
        .describe('Tag operation: "add" appends, "remove" deletes, "set" replaces all'),
      tags: z.array(z.string()).describe('List of tag names to apply')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let workspaceId = await client.getWorkspaceId();

    await client.manageImageTags(
      workspaceId,
      ctx.input.projectId,
      ctx.input.imageId,
      ctx.input.operation,
      ctx.input.tags
    );

    return {
      output: { success: true },
      message: `Successfully **${ctx.input.operation === 'add' ? 'added' : ctx.input.operation === 'remove' ? 'removed' : 'set'}** tags [${ctx.input.tags.join(', ')}] on image **${ctx.input.imageId}**.`
    };
  })
  .build();
