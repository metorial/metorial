import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let emailRecipientSchema = z.object({
  email: z.string().describe('Recipient email address'),
  name: z.string().optional().describe('Recipient display name')
});

export let sendEmail = SlateTool.create(spec, {
  name: 'Send Email',
  key: 'send_email',
  description: `Compose and send an email through Mixmax. Supports HTML body, multiple recipients (to, cc, bcc), and optional tracking for opens, clicks, and file downloads.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      to: z.array(emailRecipientSchema).min(1).describe('Primary recipients'),
      cc: z.array(emailRecipientSchema).optional().describe('CC recipients'),
      bcc: z.array(emailRecipientSchema).optional().describe('BCC recipients'),
      subject: z.string().describe('Email subject line'),
      body: z.string().describe('Email body in HTML format'),
      trackingEnabled: z
        .boolean()
        .optional()
        .describe('Enable open tracking (default: false)'),
      linkTrackingEnabled: z
        .boolean()
        .optional()
        .describe('Enable link click tracking (default: false)')
    })
  )
  .output(
    z.object({
      messageId: z.string().optional().describe('ID of the sent message'),
      success: z.boolean().describe('Whether the email was sent successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.sendEmail({
      to: ctx.input.to,
      cc: ctx.input.cc,
      bcc: ctx.input.bcc,
      subject: ctx.input.subject,
      body: ctx.input.body,
      trackingEnabled: ctx.input.trackingEnabled,
      linkTrackingEnabled: ctx.input.linkTrackingEnabled
    });

    return {
      output: {
        messageId: result?._id,
        success: true
      },
      message: `Email sent to ${ctx.input.to.map(r => r.email).join(', ')} with subject "${ctx.input.subject}".`
    };
  })
  .build();
