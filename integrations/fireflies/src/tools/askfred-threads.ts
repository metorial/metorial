import { SlateTool } from 'slates';
import { z } from 'zod';
import { FirefliesClient } from '../lib/client';
import { spec } from '../spec';

let threadSummarySchema = z.object({
  threadId: z.string().nullable(),
  title: z.string().nullable(),
  transcriptId: z.string().nullable(),
  userId: z.string().nullable(),
  createdAt: z.string().nullable()
});

let messageSchema = z.object({
  messageId: z.string().nullable(),
  threadId: z.string().nullable(),
  query: z.string().nullable(),
  answer: z.string().nullable(),
  suggestedQueries: z.array(z.string()).nullable(),
  status: z.string().nullable(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable()
});

let mapThreadSummary = (thread: any) => ({
  threadId: thread?.id ?? null,
  title: thread?.title ?? null,
  transcriptId: thread?.transcript_id ?? null,
  userId: thread?.user_id ?? null,
  createdAt: thread?.created_at ?? null
});

export let listAskFredThreads = SlateTool.create(spec, {
  name: 'List AskFred Threads',
  key: 'list_askfred_threads',
  description: `List AskFred conversation threads for the authenticated user, optionally filtered to a transcript.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      transcriptId: z.string().optional().describe('Filter threads for a transcript')
    })
  )
  .output(
    z.object({
      threads: z.array(threadSummarySchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new FirefliesClient({ token: ctx.auth.token });
    let threads = await client.getAskFredThreads(ctx.input.transcriptId);
    let mapped = (threads || []).map((thread: any) => mapThreadSummary(thread));

    return {
      output: { threads: mapped },
      message: `Found **${mapped.length}** AskFred thread(s).`
    };
  })
  .build();

export let getAskFredThread = SlateTool.create(spec, {
  name: 'Get AskFred Thread',
  key: 'get_askfred_thread',
  description: `Retrieve an AskFred conversation thread with all messages.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      threadId: z.string().describe('AskFred thread ID')
    })
  )
  .output(
    threadSummarySchema.extend({
      messages: z.array(messageSchema).nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FirefliesClient({ token: ctx.auth.token });
    let thread = await client.getAskFredThread(ctx.input.threadId);
    let output = {
      ...mapThreadSummary(thread),
      messages: Array.isArray(thread?.messages)
        ? thread.messages.map((message: any) => ({
            messageId: message?.id ?? null,
            threadId: message?.thread_id ?? null,
            query: message?.query ?? null,
            answer: message?.answer ?? null,
            suggestedQueries: Array.isArray(message?.suggested_queries)
              ? message.suggested_queries
              : null,
            status: message?.status ?? null,
            createdAt: message?.created_at ?? null,
            updatedAt: message?.updated_at ?? null
          }))
        : null
    };

    return {
      output,
      message: `Retrieved AskFred thread **${output.title ?? output.threadId}**.`
    };
  })
  .build();

export let deleteAskFredThread = SlateTool.create(spec, {
  name: 'Delete AskFred Thread',
  key: 'delete_askfred_thread',
  description: `Delete an AskFred conversation thread and all its messages.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      threadId: z.string().describe('AskFred thread ID to delete')
    })
  )
  .output(threadSummarySchema)
  .handleInvocation(async ctx => {
    let client = new FirefliesClient({ token: ctx.auth.token });
    let deleted = await client.deleteAskFredThread(ctx.input.threadId);
    let output = mapThreadSummary(deleted);

    return {
      output,
      message: `Deleted AskFred thread **${output.title ?? output.threadId}**.`
    };
  })
  .build();
