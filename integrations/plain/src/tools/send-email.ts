import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendEmail = SlateTool.create(spec, {
  name: 'Send Email',
  key: 'send_email',
  description: `Send a new email to a customer. This creates a new thread with an outbound email. You can also specify Cc and Bcc recipients.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      customerId: z.string().describe('Plain customer ID'),
      subject: z.string().describe('Email subject'),
      textContent: z.string().optional().describe('Plain text content of the email'),
      markdownContent: z.string().optional().describe('Markdown content of the email'),
      additionalRecipients: z
        .array(
          z.object({
            email: z.string().describe('Cc recipient email'),
            name: z.string().optional().describe('Cc recipient name')
          })
        )
        .optional()
        .describe('Cc recipients'),
      hiddenRecipients: z
        .array(
          z.object({
            email: z.string().describe('Bcc recipient email'),
            name: z.string().optional().describe('Bcc recipient name')
          })
        )
        .optional()
        .describe('Bcc recipients')
    })
  )
  .output(
    z.object({
      emailId: z.string().describe('Sent email ID'),
      subject: z.string().nullable().describe('Email subject'),
      createdAt: z.string().describe('ISO 8601 creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let input: any = {
      customerIdentifier: { customerId: ctx.input.customerId },
      subject: ctx.input.subject
    };

    if (ctx.input.textContent) {
      input.textContent = ctx.input.textContent;
    }
    if (ctx.input.markdownContent) {
      input.markdownContent = ctx.input.markdownContent;
    }
    if (ctx.input.additionalRecipients) {
      input.additionalRecipients = ctx.input.additionalRecipients;
    }
    if (ctx.input.hiddenRecipients) {
      input.hiddenRecipients = ctx.input.hiddenRecipients;
    }

    let res = await client.sendNewEmail(input);
    let email = res.email;

    return {
      output: {
        emailId: email.id,
        subject: email.subject,
        createdAt: email.createdAt?.iso8601
      },
      message: `Email sent: **${email.subject}**`
    };
  })
  .build();
