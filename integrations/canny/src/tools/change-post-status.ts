import { SlateTool } from 'slates';
import { z } from 'zod';
import { CannyClient } from '../lib/client';
import { spec } from '../spec';

export let changePostStatusTool = SlateTool.create(spec, {
  name: 'Change Post Status',
  key: 'change_post_status',
  description: `Change the status of a feedback post. Optionally notify voters about the status change and include a comment explaining the change.`,
  instructions: [
    'Standard statuses: "open", "under review", "planned", "in progress", "complete", "closed". Custom statuses may also be available.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      postId: z.string().describe('The ID of the post to update'),
      changerId: z.string().describe('Canny user ID of the person changing the status'),
      status: z
        .string()
        .describe(
          'New status to set (e.g., "open", "under review", "planned", "in progress", "complete", "closed")'
        ),
      shouldNotifyVoters: z
        .boolean()
        .optional()
        .describe('Whether to notify voters about the change'),
      commentValue: z
        .string()
        .optional()
        .describe('Optional comment to include with the status change'),
      commentImageURLs: z
        .array(z.string())
        .optional()
        .describe('Image URLs for the status change comment')
    })
  )
  .output(
    z.object({
      postId: z.string().describe('ID of the updated post')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CannyClient(ctx.auth.token);
    let result = await client.changePostStatus({
      postID: ctx.input.postId,
      changerID: ctx.input.changerId,
      status: ctx.input.status,
      shouldNotifyVoters: ctx.input.shouldNotifyVoters,
      commentValue: ctx.input.commentValue,
      commentImageURLs: ctx.input.commentImageURLs
    });

    return {
      output: { postId: result.id },
      message: `Changed status of post **${result.id}** to **${ctx.input.status}**.`
    };
  })
  .build();
