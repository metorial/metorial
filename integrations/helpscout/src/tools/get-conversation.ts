import { SlateTool } from 'slates';
import { z } from 'zod';
import { HelpScoutClient } from '../lib/client';
import { spec } from '../spec';

let threadSchema = z.object({
  threadId: z.number().describe('Thread ID'),
  type: z.string().describe('Thread type (customer, reply, note, etc.)'),
  status: z.string().optional().describe('Thread status'),
  state: z
    .string()
    .optional()
    .describe('Thread state (published, draft, hidden, review, bounced)'),
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
  to: z.array(z.string()).optional().describe('Recipient email addresses'),
  cc: z.array(z.string()).optional().describe('CC email addresses'),
  bcc: z.array(z.string()).optional().describe('BCC email addresses'),
  attachments: z
    .array(
      z.object({
        attachmentId: z.number().describe('Attachment ID'),
        fileName: z.string().nullable().describe('File name'),
        mimeType: z.string().nullable().describe('MIME type'),
        size: z.number().nullable().describe('File size in bytes')
      })
    )
    .optional()
    .describe('Files attached to the thread'),
  createdAt: z.string().describe('Creation timestamp')
});

export let getConversation = SlateTool.create(spec, {
  name: 'Get Conversation',
  key: 'get_conversation',
  description: `Retrieve a single conversation with its full details and threads. Returns the conversation metadata, custom field values, and all threads (customer messages, replies, notes, etc.) including attachment metadata.`,
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
      folderId: z.number().optional().describe('Folder ID'),
      assigneeId: z.number().nullable().optional().describe('Assigned user or team ID'),
      assigneeName: z.string().nullable().optional().describe('Assigned user or team name'),
      customerId: z.number().nullable().optional().describe('Primary customer ID'),
      customerEmail: z.string().nullable().optional().describe('Primary customer email'),
      customerName: z.string().nullable().optional().describe('Primary customer name'),
      tags: z.array(z.string()).describe('Tags on the conversation'),
      customFields: z
        .array(
          z.object({
            fieldId: z.number(),
            name: z.string(),
            value: z.string().nullable(),
            text: z
              .string()
              .nullable()
              .optional()
              .describe('Display text (the option label for dropdown fields)')
          })
        )
        .optional()
        .describe('Custom field values'),
      createdAt: z.string().describe('Creation timestamp'),
      closedAt: z.string().nullable().optional().describe('Closed timestamp'),
      webUrl: z
        .string()
        .nullable()
        .optional()
        .describe('Link that opens the conversation in the Help Scout web app'),
      threads: z.array(threadSchema).describe('All threads in the conversation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HelpScoutClient(ctx.auth.token);
    let data = await client.getConversation(ctx.input.conversationId);

    let threadsList = await client.listAllThreads(ctx.input.conversationId);

    let threads = threadsList.map((t: any) => ({
      threadId: t.id,
      type: t.type,
      status: t.status,
      state: t.state,
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
      to: t.to ?? undefined,
      cc: t.cc ?? undefined,
      bcc: t.bcc ?? undefined,
      attachments: (t._embedded?.attachments ?? []).map((a: any) => ({
        attachmentId: a.id,
        fileName: a.filename ?? a.fileName ?? null,
        mimeType: a.mimeType ?? null,
        size: typeof a.size === 'number' ? a.size : null
      })),
      createdAt: t.createdAt
    }));

    let customFields = (data.customFields ?? []).map((f: any) => ({
      fieldId: f.id,
      name: f.name,
      value: f.value ?? null,
      text: f.text ?? null
    }));

    return {
      output: {
        conversationId: data.id,
        number: data.number,
        subject: data.subject,
        status: data.status,
        type: data.type,
        mailboxId: data.mailboxId,
        folderId: data.folderId,
        assigneeId: data.assignee?.id ?? null,
        assigneeName: data.assignee
          ? [data.assignee.first, data.assignee.last].filter(Boolean).join(' ')
          : null,
        customerId: data.primaryCustomer?.id ?? null,
        customerEmail: data.primaryCustomer?.email ?? null,
        customerName: data.primaryCustomer
          ? [data.primaryCustomer.first, data.primaryCustomer.last].filter(Boolean).join(' ')
          : null,
        tags: (data.tags ?? []).map((t: any) => t.tag ?? t),
        customFields,
        createdAt: data.createdAt,
        closedAt: data.closedAt ?? null,
        webUrl: data._links?.web?.href ?? null,
        threads
      },
      message: `Conversation **#${data.number ?? data.id}**: "${data.subject}" — ${data.status}, ${threads.length} threads.`
    };
  })
  .build();
