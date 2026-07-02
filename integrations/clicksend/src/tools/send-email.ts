import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClickSendClient } from '../lib/client';
import { spec } from '../spec';

export let sendEmailTool = SlateTool.create(spec, {
  name: 'Send Email',
  key: 'send_email',
  description: `Send transactional emails via ClickSend's SMTP gateway. Requires a verified sender email address (identified by its email address ID). Supports HTML body content, multiple recipients, and scheduled delivery.`,
  instructions: [
    'The from.emailAddressId must reference a verified email address in your ClickSend account',
    'Use the "Get Account Info" tool to find your allowed email addresses and their IDs',
    'The body supports HTML content'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      to: z
        .array(
          z.object({
            email: z.string().describe('Recipient email address'),
            name: z.string().optional().describe('Recipient display name')
          })
        )
        .min(1)
        .describe('List of email recipients'),
      fromEmailAddressId: z
        .number()
        .describe('ID of the verified sender email address in your ClickSend account'),
      fromName: z.string().optional().describe('Sender display name'),
      subject: z.string().describe('Email subject line'),
      body: z.string().describe('Email body content (supports HTML)'),
      schedule: z.number().optional().describe('Unix timestamp for scheduled delivery')
    })
  )
  .output(
    z.object({
      sent: z.boolean().describe('Whether the email was successfully queued'),
      recipientCount: z.number().describe('Number of recipients')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickSendClient({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    ctx.progress('Sending email...');

    await client.sendEmail({
      to: ctx.input.to,
      from: {
        emailAddressId: ctx.input.fromEmailAddressId,
        name: ctx.input.fromName
      },
      subject: ctx.input.subject,
      body: ctx.input.body,
      schedule: ctx.input.schedule
    });

    return {
      output: {
        sent: true,
        recipientCount: ctx.input.to.length
      },
      message: `Email queued to **${ctx.input.to.length}** recipient(s) with subject "${ctx.input.subject}".`
    };
  })
  .build();
