import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { type BatchResult, MgmtClient } from '../lib/client';
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
      batchId: z
        .number()
        .optional()
        .describe('Queued batch ID. Use get_batch_status if success is false.'),
      success: z.boolean().describe('Whether the write batch completed successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MgmtClient({
      token: ctx.auth.token,
      guid: ctx.config.guid,
      locale: ctx.input.locale || ctx.config.locale,
      region: ctx.auth.region,
      authMethod: ctx.auth.authMethod
    });

    if (ctx.input.contentIds.some(id => !Number.isInteger(id) || id <= 0)) {
      throw createApiServiceError('contentIds must contain positive whole-number IDs.');
    }
    let result: BatchResult;
    if (ctx.input.contentIds.length === 1) {
      let contentId = ctx.input.contentIds[0]!;
      let operations = {
        publish: () => client.publishContentItem(contentId, ctx.input.comments),
        unpublish: () => client.unpublishContentItem(contentId, ctx.input.comments),
        'request-approval': () => client.requestApproval(contentId, ctx.input.comments),
        approve: () => client.approveContentItem(contentId, ctx.input.comments),
        decline: () => client.declineContentItem(contentId, ctx.input.comments)
      };
      result = await operations[ctx.input.action]();
    } else {
      if (ctx.input.comments) {
        throw createApiServiceError(
          'Agility CMS batch workflow does not accept comments. Omit comments or apply the action to one content item at a time.'
        );
      }
      result = await client.batchWorkflow(ctx.input.contentIds, ctx.input.action);
    }

    return {
      output: {
        contentIds: ctx.input.contentIds,
        action: ctx.input.action,
        batchId: result.batchId,
        success: result.completed
      },
      message: result.completed
        ? `Applied **${ctx.input.action}** to **${ctx.input.contentIds.length}** content item(s): ${ctx.input.contentIds.join(', ')}`
        : `Workflow is still pending in batch **#${result.batchId}**. Call get_batch_status to check completion.`
    };
  })
  .build();
