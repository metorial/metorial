import { createTextAttachment, SlateTool } from 'slates';
import { z } from 'zod';
import { MailgunClient } from '../lib/client';
import { mailgunServiceError } from '../lib/errors';
import { spec } from '../spec';

let getStoredMessageString = (message: Record<string, unknown>, key: string) => {
  let value = message[key];
  return typeof value === 'string' ? value : undefined;
};

let messageFileSchema = z.object({
  filename: z.string().describe('Filename Mailgun should use for the attachment'),
  contentBase64: z.string().describe('Base64-encoded file content'),
  contentType: z
    .string()
    .optional()
    .describe('MIME type for the file, defaulting to application/octet-stream')
});

let assertValidBase64Files = (
  files: Array<{ filename: string; contentBase64: string }> | undefined,
  label: string
) => {
  for (let [index, file] of (files ?? []).entries()) {
    let buffer = Buffer.from(file.contentBase64, 'base64');
    if (buffer.length === 0) {
      throw mailgunServiceError(`${label}[${index}] must contain non-empty base64 content.`);
    }
  }
};

export let sendEmail = SlateTool.create(spec, {
  name: 'Send Email',
  key: 'send_email',
  description: `Send an email through Mailgun. Supports plain text, HTML, and template-based emails with personalization.
Can send to up to 1,000 recipients per call with individual personalization via recipient variables.
Supports scheduling, tracking options, tags for analytics, custom headers, and reply-to addresses.`,
  instructions: [
    'At least one of text, html, or template must be provided.',
    'Use recipientVariables for batch personalization when sending to multiple recipients.',
    'Tags are limited to 10 per message and are useful for aggregate analytics.'
  ],
  constraints: [
    'Maximum 1,000 total recipients across to, cc, and bcc.',
    'Maximum 10 tags per message.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      domain: z.string().describe('Sending domain name (e.g. "mg.example.com")'),
      from: z.string().describe('Sender address, e.g. "User Name <user@mg.example.com>"'),
      to: z.array(z.string()).describe('List of recipient email addresses'),
      cc: z.array(z.string()).optional().describe('CC recipient email addresses'),
      bcc: z.array(z.string()).optional().describe('BCC recipient email addresses'),
      subject: z.string().optional().describe('Email subject line'),
      text: z.string().optional().describe('Plain text body of the email'),
      html: z.string().optional().describe('HTML body of the email'),
      template: z.string().optional().describe('Name of a stored Mailgun template to use'),
      templateVersion: z.string().optional().describe('Template version tag to use'),
      templateVariables: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Variables to pass into the template'),
      replyTo: z.string().optional().describe('Reply-To email address'),
      tags: z.array(z.string()).optional().describe('Tags for analytics (max 10)'),
      deliveryTime: z
        .string()
        .optional()
        .describe('Scheduled delivery time in RFC 2822 format'),
      testMode: z
        .boolean()
        .optional()
        .describe('When true, Mailgun accepts but does not deliver the message'),
      tracking: z.boolean().optional().describe('Enable or disable all tracking'),
      trackingClicks: z
        .enum(['yes', 'no', 'htmlonly'])
        .optional()
        .describe('Enable click tracking'),
      trackingOpens: z.boolean().optional().describe('Enable open tracking'),
      requireTls: z.boolean().optional().describe('Require TLS for delivery'),
      customHeaders: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom MIME headers (without the h: prefix)'),
      customVariables: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom JSON variables attached to the message (without the v: prefix)'),
      recipientVariables: z
        .record(z.string(), z.record(z.string(), z.unknown()))
        .optional()
        .describe('Per-recipient personalization variables keyed by email address'),
      sendingIp: z.string().optional().describe('Specific IP address to send from'),
      sendingIpPool: z.string().optional().describe('IP pool ID to send from'),
      attachments: z
        .array(messageFileSchema)
        .optional()
        .describe('Files to attach to the message'),
      inlineAttachments: z
        .array(messageFileSchema)
        .optional()
        .describe('Files to attach with inline disposition for CID references')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Mailgun message ID'),
      status: z.string().describe('Status message from Mailgun')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.text && !ctx.input.html && !ctx.input.template) {
      throw mailgunServiceError('At least one of text, html, or template must be provided.');
    }

    let recipientCount =
      ctx.input.to.length + (ctx.input.cc?.length || 0) + (ctx.input.bcc?.length || 0);

    if (recipientCount < 1) {
      throw mailgunServiceError('At least one recipient is required.');
    }

    if (recipientCount > 1000) {
      throw mailgunServiceError('Mailgun supports at most 1,000 recipients per send.');
    }

    if ((ctx.input.tags?.length ?? 0) > 10) {
      throw mailgunServiceError('Mailgun supports at most 10 tags per message.');
    }

    assertValidBase64Files(ctx.input.attachments, 'attachments');
    assertValidBase64Files(ctx.input.inlineAttachments, 'inlineAttachments');

    let client = new MailgunClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.sendMessage(ctx.input.domain, {
      from: ctx.input.from,
      to: ctx.input.to,
      cc: ctx.input.cc,
      bcc: ctx.input.bcc,
      subject: ctx.input.subject,
      text: ctx.input.text,
      html: ctx.input.html,
      template: ctx.input.template,
      templateVersion: ctx.input.templateVersion,
      templateVariables: ctx.input.templateVariables,
      replyTo: ctx.input.replyTo,
      tags: ctx.input.tags,
      deliveryTime: ctx.input.deliveryTime,
      testMode: ctx.input.testMode,
      tracking: ctx.input.tracking,
      trackingClicks: ctx.input.trackingClicks,
      trackingOpens: ctx.input.trackingOpens,
      requireTls: ctx.input.requireTls,
      customHeaders: ctx.input.customHeaders,
      customVariables: ctx.input.customVariables,
      recipientVariables: ctx.input.recipientVariables,
      sendingIp: ctx.input.sendingIp,
      sendingIpPool: ctx.input.sendingIpPool,
      attachments: ctx.input.attachments,
      inlineAttachments: ctx.input.inlineAttachments
    });

    return {
      output: {
        messageId: result.id,
        status: result.message
      },
      message: `Email queued for delivery to **${recipientCount}** recipient(s). Message ID: \`${result.id}\``
    };
  })
  .build();

export let getStoredMessage = SlateTool.create(spec, {
  name: 'Get Stored Message',
  key: 'get_stored_message',
  description: `Retrieve a message stored by Mailgun from a storage key found in events, logs, or inbound route store actions. The stored message payload is returned as a JSON attachment, with metadata in the tool output.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      domain: z.string().describe('Domain that stored the message'),
      storageKey: z.string().describe('Mailgun storage key for the stored message')
    })
  )
  .output(
    z.object({
      domain: z.string().describe('Domain used for retrieval'),
      storageKey: z.string().describe('Storage key used for retrieval'),
      subject: z.string().optional().describe('Stored message subject if present'),
      sender: z.string().optional().describe('Stored message sender if present'),
      recipients: z.string().optional().describe('Stored message recipients if present'),
      attachmentCount: z.number().describe('Number of Slate attachments returned'),
      byteLength: z.number().describe('UTF-8 byte length of the JSON attachment')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailgunClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let message = await client.getStoredMessage(ctx.input.domain, ctx.input.storageKey);
    let content = JSON.stringify(message, null, 2);

    return {
      output: {
        domain: ctx.input.domain,
        storageKey: ctx.input.storageKey,
        subject: getStoredMessageString(message, 'Subject'),
        sender:
          getStoredMessageString(message, 'From') ?? getStoredMessageString(message, 'sender'),
        recipients:
          getStoredMessageString(message, 'To') ??
          getStoredMessageString(message, 'recipients'),
        attachmentCount: 1,
        byteLength: Buffer.byteLength(content, 'utf8')
      },
      attachments: [createTextAttachment(content, 'application/json')],
      message: `Retrieved stored Mailgun message **${ctx.input.storageKey}** as a JSON attachment.`
    };
  })
  .build();
