import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppDragClient } from '../lib/client';
import { spec } from '../spec';

export let sendEmail = SlateTool.create(spec, {
  name: 'Send Transactional Email',
  key: 'send_email',
  description: `Send a transactional email using AppDrag's built-in email service. Uses transactional email credits included in your AppDrag plan instead of requiring an external SMTP server.`,
  instructions: [
    'The sender email address (fromAddress) must be verified in AppDrag before sending.',
    'Set isHtml to true to send HTML-formatted email content.'
  ],
  constraints: ['Sending consumes transactional email credits from your AppDrag plan.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      fromAddress: z.string().describe('The verified sender email address.'),
      senderName: z.string().describe('Display name of the sender.'),
      toAddress: z.string().describe('Recipient email address.'),
      subject: z.string().describe('Email subject line.'),
      body: z
        .string()
        .describe(
          'Email body content. Can be plain text or HTML depending on the isHtml flag.'
        ),
      isHtml: z
        .boolean()
        .default(false)
        .describe('Whether the body content is HTML formatted.')
    })
  )
  .output(
    z.object({
      result: z.any().describe('Result from the email API indicating success or failure.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AppDragClient({
      apiKey: ctx.auth.token,
      appId: ctx.config.appId
    });

    let result = await client.sendEmail({
      from: ctx.input.fromAddress,
      sender: ctx.input.senderName,
      to: ctx.input.toAddress,
      subject: ctx.input.subject,
      content: ctx.input.body,
      isHtml: ctx.input.isHtml
    });

    return {
      output: {
        result
      },
      message: `Email sent to **${ctx.input.toAddress}** with subject "${ctx.input.subject}".`
    };
  })
  .build();
