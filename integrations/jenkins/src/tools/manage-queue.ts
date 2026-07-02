import { SlateTool } from 'slates';
import { z } from 'zod';
import { JenkinsClient } from '../lib/client';
import { spec } from '../spec';

export let manageQueue = SlateTool.create(spec, {
  name: 'Manage Build Queue',
  key: 'manage_queue',
  description: `List items in the Jenkins build queue or cancel a queued build. Use **list** to see all pending builds and their reasons, or **cancel** to remove a specific item from the queue.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'cancel']).describe('Action to perform on the queue'),
      queueItemId: z
        .number()
        .optional()
        .describe('Queue item ID to cancel. Required for "cancel" action.')
    })
  )
  .output(
    z.object({
      items: z
        .array(
          z.object({
            queueItemId: z.number().describe('Queue item ID'),
            taskName: z.string().optional().describe('Name of the queued job'),
            taskUrl: z.string().optional().describe('URL of the queued job'),
            why: z.string().optional().nullable().describe('Reason the build is still queued'),
            stuck: z.boolean().optional().describe('Whether the queue item is stuck'),
            blocked: z.boolean().optional().describe('Whether the queue item is blocked'),
            buildable: z.boolean().optional().describe('Whether the queue item is buildable'),
            inQueueSince: z
              .number()
              .optional()
              .describe('Timestamp when item entered the queue')
          })
        )
        .optional()
        .describe('Queue items (for "list" action)'),
      cancelled: z
        .boolean()
        .optional()
        .describe('Whether the cancellation was successful (for "cancel" action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new JenkinsClient({
      instanceUrl: ctx.config.instanceUrl,
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    if (ctx.input.action === 'cancel') {
      if (!ctx.input.queueItemId) throw new Error('queueItemId is required for cancel action');
      await client.cancelQueueItem(ctx.input.queueItemId);
      return {
        output: { cancelled: true },
        message: `Cancelled queue item **#${ctx.input.queueItemId}**.`
      };
    }

    let queue = await client.getQueue();
    let items = (queue.items || []).map((item: any) => ({
      queueItemId: item.id,
      taskName: item.task?.name,
      taskUrl: item.task?.url,
      why: item.why,
      stuck: item.stuck,
      blocked: item.blocked,
      buildable: item.buildable,
      inQueueSince: item.inQueueSince
    }));

    return {
      output: { items },
      message: `Build queue has **${items.length}** item(s).`
    };
  })
  .build();
