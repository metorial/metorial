import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { harvestAccountIdSchema, resolveHarvestAccountId } from '../lib/account-id';
import { HarvestClient } from '../lib/client';
import { spec } from '../spec';

export let sendInvoice = SlateTool.create(spec, {
  name: 'Send Invoice',
  key: 'send_invoice',
  description: `Email an invoice by omitting eventType, or record a lifecycle event (send, close, re-open, draft). The send event only marks an invoice sent; it does not email recipients. Can include a PDF attachment and a link to the client invoice portal. Call list_accounts to discover account IDs when choosing between multiple accounts.`,
  instructions: [
    'Omit eventType to email an invoice. Valid eventType values are "send", "close", "draft", and "re-open"; each records a lifecycle event without emailing.',
    'When emailing, provide at least one recipient email address or set sendMeACopy to true.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      accountId: harvestAccountIdSchema,
      invoiceId: z.number().describe('ID of the invoice to send'),
      eventType: z
        .string()
        .optional()
        .describe(
          'Lifecycle event: "send", "close", "draft", "re-open". Omit to send an email; "send" only marks the invoice sent.'
        ),
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
        .describe(
          'Legacy option: false clears invoice payment options; true is ignored. Email links follow the invoice payment options.'
        ),
      attachPdf: z.boolean().optional().describe('Attach PDF of the invoice'),
      sendMeACopy: z.boolean().optional().describe('Send a copy to yourself')
    })
  )
  .output(
    z.object({
      messageId: z.number().describe('ID of the created message'),
      invoiceId: z.number().describe('ID of the invoice'),
      emailed: z
        .boolean()
        .describe('Whether the request sent an email instead of recording a lifecycle event'),
      eventType: z
        .string()
        .nullable()
        .describe('Recorded lifecycle event, or null for an email'),
      sentTo: z.string().optional().describe('Recipients the message was sent to')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HarvestClient({
      token: ctx.auth.token,
      accountId: resolveHarvestAccountId(ctx)
    });

    if (
      ctx.input.eventType !== undefined &&
      !['send', 'close', 'draft', 're-open'].includes(ctx.input.eventType)
    ) {
      throw createApiServiceError(
        'eventType must be send, close, draft, or re-open. Omit it to email the invoice.'
      );
    }
    if (
      ctx.input.eventType === undefined &&
      !ctx.input.recipients?.length &&
      !ctx.input.sendMeACopy
    ) {
      throw createApiServiceError(
        'Provide recipients or set sendMeACopy to true when emailing an invoice.'
      );
    }

    let msg = await client.createInvoiceMessage(ctx.input.invoiceId, {
      eventType: ctx.input.eventType,
      recipients: ctx.input.recipients,
      subject: ctx.input.subject,
      body: ctx.input.body,
      includeLinkToClientInvoice: ctx.input.includeLinkToClientInvoice,
      attachPdf: ctx.input.attachPdf,
      sendMeACopy: ctx.input.sendMeACopy
    });

    let emailed = ctx.input.eventType === undefined;
    let sentTo = emailed
      ? msg.recipients?.map((recipient: { email: string }) => recipient.email).join(', ')
      : undefined;

    return {
      output: {
        messageId: msg.id,
        invoiceId: ctx.input.invoiceId,
        emailed,
        eventType: msg.event_type ?? null,
        sentTo
      },
      message: emailed
        ? `Sent invoice **#${ctx.input.invoiceId}**${sentTo ? ` to ${sentTo}` : ' by email'}.`
        : `Recorded event "${ctx.input.eventType}" for invoice **#${ctx.input.invoiceId}**.`
    };
  })
  .build();
