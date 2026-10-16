import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateThreadLabels = SlateTool.create(spec, {
  name: 'Update Thread Labels',
  key: 'update_thread_labels',
  description:
    'Add or remove custom labels on every message in a thread. System labels cannot be changed. AgentMail rejects threads with 100 or more messages.',
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      inboxId: z
        .string()
        .describe('Inbox containing the thread. Call list_inboxes to discover inbox IDs.'),
      threadId: z.string().describe('Thread ID from list_threads or search_threads.'),
      addLabels: z.array(z.string()).optional().describe('Custom labels to add.'),
      removeLabels: z
        .array(z.string())
        .optional()
        .describe(
          'Custom labels to remove; removal takes priority if a label appears in both lists.'
        )
    })
  )
  .output(z.object({ threadId: z.string(), labels: z.array(z.string()) }))
  .handleInvocation(async ctx => {
    let result = await new Client({
      token: ctx.auth.token,
      podId: ctx.config.podId
    }).updateThreadLabels(
      ctx.input.inboxId,
      ctx.input.threadId,
      ctx.input.addLabels,
      ctx.input.removeLabels
    );
    return {
      output: { threadId: result.thread_id, labels: result.labels },
      message: `Updated labels on thread ${result.thread_id}.`
    };
  })
  .build();
