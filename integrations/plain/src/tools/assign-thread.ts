import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let assignThread = SlateTool.create(spec, {
  name: 'Assign Thread',
  key: 'assign_thread',
  description: `Assign or unassign a support thread. Provide a userId to assign, or set unassign to true to remove the current assignment.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      threadId: z.string().describe('Plain thread ID'),
      userId: z.string().optional().describe('User ID to assign the thread to'),
      unassign: z.boolean().optional().describe('Set to true to unassign the thread')
    })
  )
  .output(
    z.object({
      threadId: z.string().describe('Plain thread ID'),
      status: z.string().describe('Thread status'),
      title: z.string().nullable().describe('Thread title')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let thread: any;
    if (ctx.input.unassign) {
      let res = await client.unassignThread(ctx.input.threadId);
      thread = res.thread;
    } else if (ctx.input.userId) {
      let res = await client.assignThread(ctx.input.threadId, ctx.input.userId);
      thread = res.thread;
    } else {
      throw new Error('Provide userId to assign, or set unassign to true');
    }

    return {
      output: {
        threadId: thread.id,
        status: thread.status,
        title: thread.title
      },
      message: ctx.input.unassign
        ? `Thread **${thread.title || thread.id}** unassigned`
        : `Thread **${thread.title || thread.id}** assigned to user **${ctx.input.userId}**`
    };
  })
  .build();
