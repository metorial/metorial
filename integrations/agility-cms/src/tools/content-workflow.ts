import { SlateTool } from 'slates';
import { z } from 'zod';
import { MgmtClient } from '../lib/client';
import { spec } from '../spec';

export let contentWorkflow = SlateTool.create(spec, {
  name: 'Content Workflow',
  key: 'content_workflow',
  description: `Performs workflow operations on content items: **publish**, **unpublish**, **request-approval**, **approve**, or **decline**. Supports both individual items and batch operations on multiple items at once. Requires OAuth authentication.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['publish', 'unpublish', 'request-approval', 'approve', 'decline'])
        .describe('Workflow action to perform'),
      contentIds: z
        .array(z.number())
        .min(1)
        .describe('One or more content item IDs to apply the workflow action to'),
      comments: z.string().optional().describe('Optional comments for the workflow action'),
      locale: z.string().optional().describe('Locale code override')
    })
  )
  .output(
    z.object({
      contentIds: z.array(z.number()).describe('IDs of the items the action was applied to'),
      action: z.string().describe('The workflow action that was performed'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MgmtClient({
      token: ctx.auth.token,
      guid: ctx.config.guid,
      locale: ctx.input.locale || ctx.config.locale,
      region: ctx.auth.region
    });

    if (ctx.input.contentIds.length === 1) {
      let contentId = ctx.input.contentIds[0]!;
      switch (ctx.input.action) {
        case 'publish':
          await client.publishContentItem(contentId, ctx.input.comments);
          break;
        case 'unpublish':
          await client.unpublishContentItem(contentId, ctx.input.comments);
          break;
        case 'request-approval':
          await client.requestApproval(contentId, ctx.input.comments);
          break;
        case 'approve':
          await client.approveContentItem(contentId, ctx.input.comments);
          break;
        case 'decline':
          await client.declineContentItem(contentId, ctx.input.comments);
          break;
      }
    } else {
      await client.batchWorkflow(ctx.input.contentIds, ctx.input.action);
    }

    return {
      output: {
        contentIds: ctx.input.contentIds,
        action: ctx.input.action,
        success: true
      },
      message: `Applied **${ctx.input.action}** to **${ctx.input.contentIds.length}** content item(s): ${ctx.input.contentIds.join(', ')}`
    };
  })
  .build();
