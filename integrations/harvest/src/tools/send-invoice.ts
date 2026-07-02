import { SlateTool } from 'slates';
import { z } from 'zod';
import { HarvestClient } from '../lib/client';
import { spec } from '../spec';

export let sendInvoice = SlateTool.create(spec, {
  name: 'Send Invoice',
  key: 'send_invoice',
  description: `Send an invoice to recipients via email, or mark it with a specific event (e.g., send, close, re-open, draft). Can include a PDF attachment and a link to the client invoice portal.`,
  instructions: [
    'Valid **eventType** values: "send", "close", "draft", "re-open".',
    'When sending, provide at least one recipient email address.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      invoiceId: z.number().describe('ID of the invoice to send'),
      eventType: z
        .string()
        .optional()
        .describe('Event type: "send", "close", "draft", "re-open"'),
      recipients: z
        .array(
          z.object({
            name: z.string().optional().describe('Recipient name'),
            email: z.string().describe('Recipient email address')
          })
        )
        .optional()
        .describe('Recipients to send the invoice to'),
      subject: z.string().optional().describe('Email subject line'),
      body: z.string().optional().describe('Email body'),
      includeLinkToClientInvoice: z
        .boolean()
        .optional()
        .describe('Include link to client invoice portal'),
      attachPdf: z.boolean().optional().describe('Attach PDF of the invoice'),
      sendMeACopy: z.boolean().optional().describe('Send a copy to yourself')
    })
  )
  .output(
    z.object({
      messageId: z.number().describe('ID of the created message'),
      invoiceId: z.number().describe('ID of the invoice'),
      sentTo: z.string().optional().describe('Recipients the message was sent to')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HarvestClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let msg = await client.createInvoiceMessage(ctx.input.invoiceId, {
      eventType: ctx.input.eventType,
      recipients: ctx.input.recipients,
      subject: ctx.input.subject,
      body: ctx.input.body,
      includeLinkToClientInvoice: ctx.input.includeLinkToClientInvoice,
      attachPdf: ctx.input.attachPdf,
      sendMeACopy: ctx.input.sendMeACopy
    });

    let sentTo = ctx.input.recipients?.map(r => r.email).join(', ');

    return {
      output: {
        messageId: msg.id,
        invoiceId: ctx.input.invoiceId,
        sentTo
      },
      message: sentTo
        ? `Sent invoice **#${ctx.input.invoiceId}** to ${sentTo}.`
        : `Updated invoice **#${ctx.input.invoiceId}** with event "${ctx.input.eventType}".`
    };
  })
  .build();
