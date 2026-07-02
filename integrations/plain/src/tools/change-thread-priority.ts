import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let changeThreadPriority = SlateTool.create(spec, {
  name: 'Change Thread Priority',
  key: 'change_thread_priority',
  description: `Change the priority level of a support thread. Priority levels: 0 = urgent, 1 = high, 2 = normal, 3 = low.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      threadId: z.string().describe('Plain thread ID'),
      priority: z
        .number()
        .describe('Priority level: 0 (urgent), 1 (high), 2 (normal), 3 (low)')
    })
  )
  .output(
    z.object({
      threadId: z.string().describe('Plain thread ID'),
      title: z.string().nullable().describe('Thread title'),
      priority: z.number().describe('Updated priority level')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let res = await client.changeThreadPriority(ctx.input.threadId, ctx.input.priority);
    let thread = res.thread;

    let labels = ['urgent', 'high', 'normal', 'low'];
    let label = labels[thread.priority] || String(thread.priority);

    return {
      output: {
        threadId: thread.id,
        title: thread.title,
        priority: thread.priority
      },
      message: `Thread **${thread.title || thread.id}** priority set to **${label}**`
    };
  })
  .build();
