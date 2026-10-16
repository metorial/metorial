import { createApiServiceError, SlateTool } from 'slates';
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
      emailTemplateId: z
        .string()
        .describe('Email template ID to use. Call list_email_templates to discover IDs.'),
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

    let order = flattenSingleResource(await client.getOrder(ctx.input.orderId));
    if (order.customer_id) attributes.customer_id = order.customer_id;
    if (ctx.input.recipientEmail !== undefined) {
      attributes.recipients = ctx.input.recipientEmail;
    } else {
      if (!order.customer_id)
        throw createApiServiceError(
          'Provide recipientEmail because the order has no customer.'
        );
      let customer = flattenSingleResource(await client.getCustomer(order.customer_id));
      if (!customer.email)
        throw createApiServiceError(
          'Provide recipientEmail because the customer has no email address.'
        );
      attributes.recipients = customer.email;
    }
    if (ctx.input.documentIds) attributes.document_ids = ctx.input.documentIds;

    let response = await client.createEmail(attributes);
    let email = flattenSingleResource(response);

    return {
      output: { email },
      message: `Created email for order ${ctx.input.orderId} (sent: ${email?.sent === true}, has error: ${email?.has_error === true}).`
    };
  })
  .build();
