import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUserThreads = SlateTool.create(spec, {
  name: 'Get User Threads',
  key: 'get_user_threads',
  description: `Retrieve all conversation threads belonging to a specific user. Returns the complete list of threads associated with the user, useful for reviewing conversation history or managing user data.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.string().describe('User ID to retrieve threads for')
    })
  )
  .output(
    z.object({
      threads: z
        .array(
          z.object({
            threadId: z.string().describe('Thread ID'),
            userId: z.string().optional().nullable().describe('Owner user ID'),
            uuid: z.string().optional().nullable().describe('Zep internal UUID'),
            createdAt: z.string().optional().nullable().describe('Creation timestamp')
          })
        )
        .describe('List of threads belonging to the user')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    let result = await client.getUserThreads(ctx.input.userId);
    let threadList = Array.isArray(result) ? result : result.threads || [];
    let threads = threadList.map((t: any) => ({
      threadId: t.thread_id,
      userId: t.user_id,
      uuid: t.uuid,
      createdAt: t.created_at
    }));
    return {
      output: { threads },
      message: `Found **${threads.length}** thread(s) for user **${ctx.input.userId}**.`
    };
  })
  .build();
