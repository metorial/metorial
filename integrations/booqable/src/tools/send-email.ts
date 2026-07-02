import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { buildClientConfig, flattenSingleResource } from '../lib/helpers';
import { spec } from '../spec';

export let sendEmail = SlateTool.create(spec, {
  name: 'Send Email',
  key: 'send_email',
  description: `Send an email to a customer using a Booqable email template. Emails can include order data, customer data, and document attachments.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      orderId: z.string().describe('Order ID to send the email for'),
      emailTemplateId: z.string().describe('Email template ID to use'),
      recipientEmail: z
        .string()
        .optional()
        .describe('Override recipient email address (defaults to customer email)'),
      documentIds: z.array(z.string()).optional().describe('Document IDs to attach as PDFs')
    })
  )
  .output(
    z.object({
      email: z.record(z.string(), z.any()).describe('The sent email record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(buildClientConfig(ctx));

    let attributes: Record<string, any> = {
      order_id: ctx.input.orderId,
      email_template_id: ctx.input.emailTemplateId
    };

    if (ctx.input.recipientEmail) attributes.recipient = ctx.input.recipientEmail;
    if (ctx.input.documentIds) attributes.document_ids = ctx.input.documentIds;

    let response = await client.createEmail(attributes);
    let email = flattenSingleResource(response);

    return {
      output: { email },
      message: `Email sent for order ${ctx.input.orderId}.`
    };
  })
  .build();
