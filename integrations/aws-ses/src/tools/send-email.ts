import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { SesClient } from '../lib/client';
import { requireAwsSesString } from '../lib/errors';
import { spec } from '../spec';

let headerSchema = z.object({
  name: z.string().describe('Header name'),
  value: z.string().describe('Header value')
});

let attachmentSchema = z.object({
  fileName: z.string().describe('Attachment file name shown to recipients'),
  rawContentBase64: z
    .string()
    .describe('Base64-encoded attachment content for the SES HTTPS API'),
  contentType: z.string().optional().describe('Attachment MIME type, such as application/pdf'),
  contentDisposition: z
    .enum(['ATTACHMENT', 'INLINE'])
    .optional()
    .describe('How the attachment should be rendered'),
  contentDescription: z.string().optional().describe('Human-readable attachment description'),
  contentId: z.string().optional().describe('Content ID for inline attachment references'),
  contentTransferEncoding: z
    .enum(['BASE64', 'QUOTED_PRINTABLE', 'SEVEN_BIT'])
    .optional()
    .describe('Transfer encoding for the attachment')
});

let recipientCount = (input: {
  toAddresses?: string[];
  ccAddresses?: string[];
  bccAddresses?: string[];
}) =>
  (input.toAddresses?.length ?? 0) +
  (input.ccAddresses?.length ?? 0) +
  (input.bccAddresses?.length ?? 0);

let determineContentMode = (input: {
  rawData?: string;
  templateName?: string;
  templateArn?: string;
  templateData?: string;
  subject?: string;
  textBody?: string;
  htmlBody?: string;
  headers?: unknown[];
  attachments?: unknown[];
  toAddresses?: string[];
  ccAddresses?: string[];
  bccAddresses?: string[];
}) => {
  let rawMode = Boolean(input.rawData);
  let templateMode = Boolean(input.templateName || input.templateArn || input.templateData);
  let simpleMode = Boolean(input.subject || input.textBody || input.htmlBody);
  let modeCount = [rawMode, templateMode, simpleMode].filter(Boolean).length;

  if (modeCount !== 1) {
    throw createApiServiceError(
      'Provide exactly one email content mode: rawData, templateName/templateArn, or simple subject/body fields.'
    );
  }

  if (rawMode) {
    if ((input.headers?.length ?? 0) > 0 || (input.attachments?.length ?? 0) > 0) {
      throw createApiServiceError(
        'headers and attachments can only be used with simple or template emails.'
      );
    }
    return 'raw' as const;
  }

  if (templateMode) {
    if (!input.templateName && !input.templateArn) {
      throw createApiServiceError(
        'templateName or templateArn is required for template emails.'
      );
    }
    if (input.templateName && input.templateArn) {
      throw createApiServiceError('Provide only one of templateName or templateArn.');
    }
    if (recipientCount(input) === 0) {
      throw createApiServiceError(
        'At least one To, Cc, or Bcc recipient is required for template emails.'
      );
    }
    return 'template' as const;
  }

  requireAwsSesString(input.subject, 'subject', 'simple email');
  if (!input.textBody && !input.htmlBody) {
    throw createApiServiceError('textBody or htmlBody is required for simple emails.');
  }
  if (recipientCount(input) === 0) {
    throw createApiServiceError(
      'At least one To, Cc, or Bcc recipient is required for simple emails.'
    );
  }

  return 'simple' as const;
};

export let sendEmail = SlateTool.create(spec, {
  name: 'Send Email',
  key: 'send_email',
  description: `Send an email through AWS SES. Supports three content modes:
- **Simple**: Provide subject and body (text/HTML) — SES handles MIME formatting.
- **Raw**: Supply a complete MIME message for full control over headers and content.
- **Template**: Use a pre-created SES template with dynamic replacement data.

Emails can be sent to multiple recipients via To, Cc, and Bcc fields.`,
  instructions: [
    'Exactly one of "simple", "raw", or "template" must be provided in the content field.',
    'The fromEmailAddress must be a verified identity in your SES account.',
    'For template emails, pass templateData as a JSON string with key-value pairs matching template variables.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      fromEmailAddress: z.string().describe('Verified sender email address'),
      toAddresses: z
        .array(z.string())
        .optional()
        .describe('List of To recipient email addresses'),
      ccAddresses: z
        .array(z.string())
        .optional()
        .describe('List of Cc recipient email addresses'),
      bccAddresses: z
        .array(z.string())
        .optional()
        .describe('List of Bcc recipient email addresses'),
      replyToAddresses: z.array(z.string()).optional().describe('Reply-to email addresses'),
      subject: z.string().optional().describe('Email subject line (required for simple mode)'),
      textBody: z.string().optional().describe('Plain text email body'),
      htmlBody: z.string().optional().describe('HTML email body'),
      rawData: z
        .string()
        .optional()
        .describe('Base64-encoded raw MIME message (for raw mode)'),
      templateName: z
        .string()
        .optional()
        .describe('Name of the SES template to use (for template mode)'),
      templateArn: z
        .string()
        .optional()
        .describe('ARN of the SES template to use (for template mode)'),
      templateData: z.string().optional().describe('JSON string of template replacement data'),
      headers: z
        .array(headerSchema)
        .optional()
        .describe('Custom message headers for simple or template mode'),
      attachments: z
        .array(attachmentSchema)
        .optional()
        .describe('Attachments for simple or template mode'),
      configurationSetName: z
        .string()
        .optional()
        .describe('Configuration set to apply to this email'),
      fromEmailAddressIdentityArn: z
        .string()
        .optional()
        .describe('Identity ARN authorizing the From email address'),
      feedbackForwardingEmailAddress: z
        .string()
        .optional()
        .describe('Address that should receive bounce and complaint notifications'),
      feedbackForwardingEmailAddressIdentityArn: z
        .string()
        .optional()
        .describe('Identity ARN authorizing the feedback forwarding address'),
      endpointId: z
        .string()
        .optional()
        .describe('SES multi-region endpoint ID to route this send through'),
      tenantName: z
        .string()
        .optional()
        .describe('SES tenant name to associate with this send'),
      emailTags: z
        .array(
          z.object({
            name: z.string(),
            value: z.string()
          })
        )
        .optional()
        .describe('Message tags for categorization and filtering'),
      contactListName: z
        .string()
        .optional()
        .describe('Contact list name for list management headers'),
      topicName: z.string().optional().describe('Topic name within the contact list')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Unique identifier for the sent message')
    })
  )
  .handleInvocation(async ctx => {
    let contentMode = determineContentMode(ctx.input);
    let client = new SesClient({
      accessKeyId: ctx.auth.accessKeyId,
      secretAccessKey: ctx.auth.secretAccessKey,
      sessionToken: ctx.auth.sessionToken,
      region: ctx.config.region
    });

    let content: any = {};
    if (contentMode === 'raw') {
      content.raw = { data: ctx.input.rawData };
    } else if (contentMode === 'template') {
      content.template = {
        templateName: ctx.input.templateName,
        templateArn: ctx.input.templateArn,
        templateData: ctx.input.templateData,
        headers: ctx.input.headers,
        attachments: ctx.input.attachments
      };
    } else {
      content.simple = {
        subject: { data: requireAwsSesString(ctx.input.subject, 'subject', 'simple email') },
        body: {
          text: ctx.input.textBody ? { data: ctx.input.textBody } : undefined,
          html: ctx.input.htmlBody ? { data: ctx.input.htmlBody } : undefined
        },
        headers: ctx.input.headers,
        attachments: ctx.input.attachments
      };
    }

    let result = await client.sendEmail({
      fromEmailAddress: ctx.input.fromEmailAddress,
      destination: {
        toAddresses: ctx.input.toAddresses,
        ccAddresses: ctx.input.ccAddresses,
        bccAddresses: ctx.input.bccAddresses
      },
      content,
      replyToAddresses: ctx.input.replyToAddresses,
      feedbackForwardingEmailAddress: ctx.input.feedbackForwardingEmailAddress,
      feedbackForwardingEmailAddressIdentityArn:
        ctx.input.feedbackForwardingEmailAddressIdentityArn,
      fromEmailAddressIdentityArn: ctx.input.fromEmailAddressIdentityArn,
      emailTags: ctx.input.emailTags,
      configurationSetName: ctx.input.configurationSetName,
      endpointId: ctx.input.endpointId,
      tenantName: ctx.input.tenantName,
      listManagementOptions: ctx.input.contactListName
        ? { contactListName: ctx.input.contactListName, topicName: ctx.input.topicName }
        : undefined
    });

    let recipients = [
      ...(ctx.input.toAddresses || []),
      ...(ctx.input.ccAddresses || []),
      ...(ctx.input.bccAddresses || [])
    ];

    return {
      output: result,
      message: `Email sent successfully to ${recipients.length} recipient(s). Message ID: \`${result.messageId}\``
    };
  })
  .build();
