import { SlateTool } from 'slates';
import { z } from 'zod';
import { HelpScoutClient } from '../lib/client';
import { spec } from '../spec';

let threadSchema = z.object({
  threadId: z.number().describe('Thread ID'),
  type: z.string().describe('Thread type (customer, reply, note, etc.)'),
  status: z.string().optional().describe('Thread status'),
  body: z.string().nullable().describe('Thread body/content'),
  createdBy: z
    .object({
      id: z.number().optional(),
      type: z.string().optional(),
      email: z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional()
    })
    .optional()
    .describe('Who created the thread'),
  createdAt: z.string().describe('Creation timestamp')
});

export let getConversation = SlateTool.create(spec, {
  name: 'Get Conversation',
  key: 'get_conversation',
  description: `Retrieve a single conversation with its full details and threads. Returns the conversation metadata plus all threads (replies, notes, etc.) in the conversation.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      conversationId: z.number().describe('The conversation ID to retrieve')
    })
  )
  .output(
    z.object({
      conversationId: z.number().describe('Conversation ID'),
      number: z.number().optional().describe('Conversation number'),
      subject: z.string().describe('Conversation subject'),
      status: z.string().describe('Conversation status'),
      type: z.string().describe('Conversation type'),
      mailboxId: z.number().optional().describe('Mailbox ID'),
      assigneeId: z.number().nullable().optional().describe('Assigned user ID'),
      assigneeName: z.string().nullable().optional().describe('Assigned user name'),
      customerEmail: z.string().nullable().optional().describe('Primary customer email'),
      customerName: z.string().nullable().optional().describe('Primary customer name'),
      tags: z.array(z.string()).describe('Tags on the conversation'),
      customFields: z
        .array(
          z.object({
            fieldId: z.number(),
            name: z.string(),
            value: z.string().nullable()
          })
        )
        .optional()
        .describe('Custom field values'),
      createdAt: z.string().describe('Creation timestamp'),
      closedAt: z.string().nullable().optional().describe('Closed timestamp'),
      threads: z.array(threadSchema).describe('All threads in the conversation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HelpScoutClient(ctx.auth.token);
    let data = await client.getConversation(ctx.input.conversationId);

    let threadsData = await client.listThreads(ctx.input.conversationId);
    let threadsList = threadsData?._embedded?.threads ?? [];

    let threads = threadsList.map((t: any) => ({
      threadId: t.id,
      type: t.type,
      status: t.status,
      body: t.body ?? null,
      createdBy: t.createdBy
        ? {
            id: t.createdBy.id,
            type: t.createdBy.type,
            email: t.createdBy.email,
            firstName: t.createdBy.first,
            lastName: t.createdBy.last
          }
        : undefined,
      createdAt: t.createdAt
    }));

    let customFields = (data.customFields ?? []).map((f: any) => ({
      fieldId: f.id,
      name: f.name,
      value: f.value ?? null
    }));

    return {
      output: {
        conversationId: data.id,
        number: data.number,
        subject: data.subject,
        status: data.status,
        type: data.type,
        mailboxId: data.mailboxId,
        assigneeId: data.assignee?.id ?? null,
        assigneeName: data.assignee
          ? [data.assignee.first, data.assignee.last].filter(Boolean).join(' ')
          : null,
        customerEmail: data.primaryCustomer?.email ?? null,
        customerName: data.primaryCustomer
          ? [data.primaryCustomer.first, data.primaryCustomer.last].filter(Boolean).join(' ')
          : null,
        tags: (data.tags ?? []).map((t: any) => t.tag ?? t),
        customFields,
        createdAt: data.createdAt,
        closedAt: data.closedAt ?? null,
        threads
      },
      message: `Conversation **#${data.number ?? data.id}**: "${data.subject}" — ${data.status}, ${threads.length} threads.`
    };
  })
  .build();
