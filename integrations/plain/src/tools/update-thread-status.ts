import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateThreadStatus = SlateTool.create(spec, {
  name: 'Update Thread Status',
  key: 'update_thread_status',
  description: `Change a thread's status to Todo, Done, or Snoozed. When snoozing, specify a duration in seconds after which the thread returns to Todo.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      threadId: z.string().describe('Plain thread ID'),
      status: z.enum(['TODO', 'DONE', 'SNOOZED']).describe('New thread status'),
      snoozeDurationSeconds: z
        .number()
        .optional()
        .describe('Snooze duration in seconds (required when status is SNOOZED)')
    })
  )
  .output(
    z.object({
      threadId: z.string().describe('Plain thread ID'),
      status: z.string().describe('Updated thread status'),
      title: z.string().nullable().describe('Thread title')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let thread: any;
    if (ctx.input.status === 'DONE') {
      let res = await client.markThreadAsDone(ctx.input.threadId);
      thread = res.thread;
    } else if (ctx.input.status === 'TODO') {
      let res = await client.markThreadAsTodo(ctx.input.threadId);
      thread = res.thread;
    } else if (ctx.input.status === 'SNOOZED') {
      if (!ctx.input.snoozeDurationSeconds) {
        throw new Error('snoozeDurationSeconds is required when status is SNOOZED');
      }
      let res = await client.snoozeThread(
        ctx.input.threadId,
        ctx.input.snoozeDurationSeconds * 1000
      );
      thread = res.thread;
    }

    return {
      output: {
        threadId: thread.id,
        status: thread.status,
        title: thread.title
      },
      message: `Thread **${thread.title || thread.id}** marked as **${thread.status}**`
    };
  })
  .build();
