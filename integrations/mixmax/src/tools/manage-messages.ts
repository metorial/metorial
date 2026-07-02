import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let emailRecipientSchema = z.object({
  email: z.string().describe('Recipient email address'),
  name: z.string().optional().describe('Recipient display name')
});

let messageSchema = z.object({
  messageId: z.string().describe('Message ID'),
  userId: z.string().optional().describe('User ID of the message owner'),
  subject: z.string().optional().describe('Email subject'),
  body: z.string().optional().describe('Email body (HTML)'),
  to: z.array(emailRecipientSchema).optional().describe('Primary recipients'),
  cc: z.array(emailRecipientSchema).optional().describe('CC recipients'),
  bcc: z.array(emailRecipientSchema).optional().describe('BCC recipients'),
  from: z
    .object({
      email: z.string().optional(),
      name: z.string().optional()
    })
    .optional()
    .describe('Sender information'),
  sent: z.string().optional().describe('When the message was sent'),
  scheduled: z.string().optional().describe('When the message is scheduled to send'),
  createdAt: z.string().optional().describe('When the message was created'),
  trackingEnabled: z.boolean().optional().describe('Whether open tracking is enabled'),
  linkTrackingEnabled: z.boolean().optional().describe('Whether link tracking is enabled')
});

export let listMessages = SlateTool.create(spec, {
  name: 'List Messages',
  key: 'list_messages',
  description: `List draft, scheduled, and sent messages. Returns messages with metadata including recipients, subject, and tracking status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of results (default: 50)'),
      cursor: z.string().optional().describe('Pagination cursor for next page')
    })
  )
  .output(
    z.object({
      messages: z.array(messageSchema).describe('List of messages'),
      nextCursor: z.string().optional().describe('Cursor for next page'),
      hasNext: z.boolean().optional().describe('Whether more results exist')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.listMessages({
      limit: ctx.input.limit,
      next: ctx.input.cursor
    });

    let results = data.results || data || [];
    let messages = results.map((m: any) => ({
      messageId: m._id,
      userId: m.userId,
      subject: m.subject,
      body: m.body,
      to: m.to,
      cc: m.cc,
      bcc: m.bcc,
      from: m.from,
      sent: m.sent,
      scheduled: m.scheduled,
      createdAt: m.created,
      trackingEnabled: m.trackingEnabled,
      linkTrackingEnabled: m.linkTrackingEnabled
    }));

    return {
      output: {
        messages,
        nextCursor: data.next,
        hasNext: data.hasNext
      },
      message: `Found ${messages.length} message(s).`
    };
  })
  .build();

export let getMessage = SlateTool.create(spec, {
  name: 'Get Message',
  key: 'get_message',
  description: `Retrieve a specific message by its ID. Returns the full message details including body, recipients, and tracking status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      messageId: z.string().describe('ID of the message to retrieve')
    })
  )
  .output(messageSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let m = await client.getMessage(ctx.input.messageId);

    return {
      output: {
        messageId: m._id,
        userId: m.userId,
        subject: m.subject,
        body: m.body,
        to: m.to,
        cc: m.cc,
        bcc: m.bcc,
        from: m.from,
        sent: m.sent,
        scheduled: m.scheduled,
        createdAt: m.created,
        trackingEnabled: m.trackingEnabled,
        linkTrackingEnabled: m.linkTrackingEnabled
      },
      message: `Retrieved message "${m.subject}".`
    };
  })
  .build();

export let createDraftMessage = SlateTool.create(spec, {
  name: 'Create Draft Message',
  key: 'create_draft_message',
  description: `Create a draft email message without sending it. The draft can later be reviewed, updated, and sent via the Send Draft tool. Supports HTML body content.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      to: z.array(emailRecipientSchema).optional().describe('Primary recipients'),
      cc: z.array(emailRecipientSchema).optional().describe('CC recipients'),
      bcc: z.array(emailRecipientSchema).optional().describe('BCC recipients'),
      subject: z.string().optional().describe('Email subject'),
      body: z.string().optional().describe('Email body (HTML format)'),
      trackingEnabled: z.boolean().optional().describe('Enable open tracking'),
      linkTrackingEnabled: z.boolean().optional().describe('Enable link click tracking'),
      inReplyTo: z.string().optional().describe('Gmail message ID to reply to')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('ID of the created draft message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createMessage({
      to: ctx.input.to,
      cc: ctx.input.cc,
      bcc: ctx.input.bcc,
      subject: ctx.input.subject,
      body: ctx.input.body,
      trackingEnabled: ctx.input.trackingEnabled,
      linkTrackingEnabled: ctx.input.linkTrackingEnabled,
      inReplyTo: ctx.input.inReplyTo
    });

    return {
      output: {
        messageId: result._id
      },
      message: `Draft message created with ID ${result._id}.`
    };
  })
  .build();

export let sendDraftMessage = SlateTool.create(spec, {
  name: 'Send Draft Message',
  key: 'send_draft_message',
  description: `Send a previously created draft message. The message must exist and have required fields (to, subject, body) set before sending.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      messageId: z.string().describe('ID of the draft message to send')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the message was sent')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.sendMessage(ctx.input.messageId);

    return {
      output: { success: true },
      message: `Draft message ${ctx.input.messageId} has been sent.`
    };
  })
  .build();
