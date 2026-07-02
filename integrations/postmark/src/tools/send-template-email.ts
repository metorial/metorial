import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendTemplateEmail = SlateTool.create(spec, {
  name: 'Send Template Email',
  key: 'send_template_email',
  description: `Send an email using a pre-defined Postmark template. Pass dynamic variables through the template model to populate the template. Identify the template by its numeric ID or string alias.`,
  instructions: [
    'Provide either **templateId** (numeric) or **templateAlias** (string) to identify the template.',
    'The **templateModel** should contain all dynamic variables your template expects.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      from: z.string().describe('Sender email address. Must be a confirmed sender signature.'),
      to: z.string().describe('Recipient email address(es). Comma-separated for multiple.'),
      cc: z.string().optional().describe('CC recipient email address(es).'),
      bcc: z.string().optional().describe('BCC recipient email address(es).'),
      templateId: z.number().optional().describe('Numeric template ID.'),
      templateAlias: z.string().optional().describe('Template alias string.'),
      templateModel: z
        .record(z.string(), z.any())
        .describe('Dynamic variables for the template as key-value pairs.'),
      replyTo: z.string().optional().describe('Reply-to email address.'),
      tag: z.string().optional().describe('Tag for categorizing the email.'),
      trackOpens: z.boolean().optional().describe('Enable open tracking.'),
      trackLinks: z
        .enum(['None', 'HtmlAndText', 'HtmlOnly', 'TextOnly'])
        .optional()
        .describe('Link tracking mode.'),
      messageStream: z.string().optional().describe('Message stream to send through.'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom metadata key-value pairs.')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Unique Postmark message ID.'),
      submittedAt: z.string().describe('Timestamp when the email was submitted.'),
      to: z.string().describe('Recipient address(es).'),
      errorCode: z.number().describe('Postmark error code (0 = success).'),
      statusMessage: z.string().describe('Status message from Postmark.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountToken: ctx.auth.accountToken
    });

    let result = await client.sendTemplateEmail({
      from: ctx.input.from,
      to: ctx.input.to,
      cc: ctx.input.cc,
      bcc: ctx.input.bcc,
      templateId: ctx.input.templateId,
      templateAlias: ctx.input.templateAlias,
      templateModel: ctx.input.templateModel,
      replyTo: ctx.input.replyTo,
      tag: ctx.input.tag,
      trackOpens: ctx.input.trackOpens,
      trackLinks: ctx.input.trackLinks,
      messageStream: ctx.input.messageStream,
      metadata: ctx.input.metadata
    });

    return {
      output: {
        messageId: result.MessageID,
        submittedAt: result.SubmittedAt,
        to: result.To,
        errorCode: result.ErrorCode,
        statusMessage: result.Message
      },
      message: `Template email sent to **${ctx.input.to}** using template ${ctx.input.templateId ?? ctx.input.templateAlias}. Message ID: \`${result.MessageID}\``
    };
  });
