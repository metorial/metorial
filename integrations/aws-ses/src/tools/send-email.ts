import { SlateTool } from 'slates';
import { z } from 'zod';
import { SesClient } from '../lib/client';
import { spec } from '../spec';

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
      templateData: z.string().optional().describe('JSON string of template replacement data'),
      configurationSetName: z
        .string()
        .optional()
        .describe('Configuration set to apply to this email'),
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
    let client = new SesClient({
      accessKeyId: ctx.auth.accessKeyId,
      secretAccessKey: ctx.auth.secretAccessKey,
      sessionToken: ctx.auth.sessionToken,
      region: ctx.config.region
    });

    let content: any = {};
    if (ctx.input.rawData) {
      content.raw = { data: ctx.input.rawData };
    } else if (ctx.input.templateName) {
      content.template = {
        templateName: ctx.input.templateName,
        templateData: ctx.input.templateData
      };
    } else {
      content.simple = {
        subject: { data: ctx.input.subject || '' },
        body: {
          text: ctx.input.textBody ? { data: ctx.input.textBody } : undefined,
          html: ctx.input.htmlBody ? { data: ctx.input.htmlBody } : undefined
        }
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
      emailTags: ctx.input.emailTags,
      configurationSetName: ctx.input.configurationSetName,
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
