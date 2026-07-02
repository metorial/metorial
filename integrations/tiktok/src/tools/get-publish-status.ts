import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TikTokConsumerClient } from '../lib/client';
import { spec } from '../spec';

export let getPublishStatus = SlateTool.create(spec, {
  name: 'Get Publish Status',
  key: 'get_publish_status',
  description: `Check the status of a previously initiated content post on TikTok. Returns the current publishing stage, any failure reasons, and the public post ID once moderation is complete.`,
  constraints: [
    'Rate limited to 30 requests per minute per user.',
    'Moderation typically completes within 1 minute but may take several hours.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      publishId: z
        .string()
        .describe('The publish ID returned from a video or photo post initialization.')
    })
  )
  .output(
    z.object({
      status: z.string().optional().describe('Current status of the publish process.'),
      publishStatus: z.number().optional().describe('Numeric publish status code.'),
      failReason: z.string().optional().describe('Reason for failure, if applicable.'),
      postIds: z
        .array(z.string())
        .optional()
        .describe('Public post IDs once the content is published and moderated.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TikTokConsumerClient({ token: ctx.auth.token });
    let result = await client.getPublishStatus(ctx.input.publishId);

    return {
      output: {
        status: result.status,
        publishStatus: result.publish_status,
        failReason: result.fail_reason,
        postIds: result.publicaly_available_post_id
      },
      message: `Publish status for \`${ctx.input.publishId}\`: **${result.status ?? 'unknown'}**${result.fail_reason ? ` (reason: ${result.fail_reason})` : ''}.`
    };
  })
  .build();
