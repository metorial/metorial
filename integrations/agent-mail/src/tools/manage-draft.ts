import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let attachmentSchema = z.object({
  filename: z.string().describe('Filename for the attachment'),
  contentType: z.string().optional().describe('MIME type of the attachment'),
  contentDisposition: z
    .enum(['inline', 'attachment'])
    .optional()
    .describe('How to display the attachment'),
  contentId: z.string().optional().describe('Content-ID for inline attachments'),
  content: z.string().optional().describe('Base64-encoded file content'),
  url: z.string().optional().describe('URL to fetch the attachment from')
});

export let manageDraft = SlateTool.create(spec, {
  name: 'Manage Draft',
  key: 'manage_draft',
  description: `Create, update, or send an email draft. Use \`action\` to specify the operation:
- **create**: Create a new draft in an inbox
- **update**: Update an existing draft's content
- **send**: Send an existing draft as an email
Drafts support scheduling via \`sendAt\` for delayed sending.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'send'])
        .describe('Operation to perform on the draft'),
      inboxId: z.string().describe('Inbox for the draft'),
      draftId: z.string().optional().describe('Required for update and send actions'),
      to: z
        .array(z.string())
        .optional()
        .describe('Recipient email addresses (required for create)'),
      cc: z.array(z.string()).optional().describe('CC recipients'),
      bcc: z.array(z.string()).optional().describe('BCC recipients'),
      replyTo: z.array(z.string()).optional().describe('Reply-to addresses'),
      subject: z.string().optional().describe('Email subject line'),
      text: z.string().optional().describe('Plain text body'),
      html: z.string().optional().describe('HTML body'),
      labels: z.array(z.string()).optional().describe('Labels for the draft'),
      attachments: z.array(attachmentSchema).optional().describe('File attachments'),
      inReplyTo: z.string().optional().describe('Message ID this draft is a reply to'),
      sendAt: z.string().optional().describe('ISO 8601 timestamp to schedule sending'),
      addLabels: z.array(z.string()).optional().describe('Labels to add when sending'),
      removeLabels: z.array(z.string()).optional().describe('Labels to remove when sending')
    })
  )
  .output(
    z.object({
      draftId: z.string().optional().describe('ID of the created/updated draft'),
      messageId: z
        .string()
        .optional()
        .describe('ID of the sent message (when action is send)'),
      threadId: z.string().optional().describe('Thread ID (when action is send)'),
      subject: z.string().optional().describe('Subject of the draft'),
      sendStatus: z.string().optional().describe('Sending status (scheduled, sending, failed)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, podId: ctx.config.podId });

    if (ctx.input.action === 'create') {
      let draft = await client.createDraft(ctx.input.inboxId, {
        to: ctx.input.to || [],
        cc: ctx.input.cc,
        bcc: ctx.input.bcc,
        replyTo: ctx.input.replyTo,
        subject: ctx.input.subject,
        text: ctx.input.text,
        html: ctx.input.html,
        labels: ctx.input.labels,
        attachments: ctx.input.attachments,
        inReplyTo: ctx.input.inReplyTo,
        sendAt: ctx.input.sendAt
      });

      return {
        output: {
          draftId: draft.draft_id,
          subject: draft.subject,
          sendStatus: draft.send_status
        },
        message: `Created draft${draft.subject ? ` "${draft.subject}"` : ''} in inbox ${ctx.input.inboxId}.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.draftId) throw new Error('draftId is required for update action');

      let draft = await client.updateDraft(ctx.input.inboxId, ctx.input.draftId, {
        to: ctx.input.to,
        cc: ctx.input.cc,
        bcc: ctx.input.bcc,
        replyTo: ctx.input.replyTo,
        subject: ctx.input.subject,
        text: ctx.input.text,
        html: ctx.input.html,
        labels: ctx.input.labels,
        attachments: ctx.input.attachments,
        inReplyTo: ctx.input.inReplyTo,
        sendAt: ctx.input.sendAt
      });

      return {
        output: {
          draftId: draft.draft_id,
          subject: draft.subject,
          sendStatus: draft.send_status
        },
        message: `Updated draft ${ctx.input.draftId}.`
      };
    }

    // send
    if (!ctx.input.draftId) throw new Error('draftId is required for send action');

    let result = await client.sendDraft(
      ctx.input.inboxId,
      ctx.input.draftId,
      ctx.input.addLabels,
      ctx.input.removeLabels
    );

    return {
      output: {
        messageId: result.message_id,
        threadId: result.thread_id
      },
      message: `Sent draft ${ctx.input.draftId} as message ${result.message_id}.`
    };
  })
  .build();
