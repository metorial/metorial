import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendCard = SlateTool.create(spec, {
  name: 'Send Card',
  key: 'send_card',
  description: `Send a physical handwritten card or note to a recipient. Provide the message, card design, handwriting style, recipient address, and optional sender address. Cards can be scheduled for future delivery by specifying a send date. You can also include a gift card or physical insert with the order.`,
  instructions: [
    'Use the **List Handwriting Styles** tool to find available font labels.',
    'Use the **Browse Cards** tool to find available card IDs.',
    'Gift card denomination IDs can be found with the **List Gift Cards** tool.',
    'Set a future `sendDate` (YYYY-MM-DD) to schedule delivery instead of sending immediately.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      cardId: z.string().describe('ID of the card/stationery design to use'),
      message: z
        .string()
        .describe('The handwritten message text (max ~320 characters depending on card)'),
      fontLabel: z.string().describe('Handwriting style font label to use for writing'),

      recipientName: z.string().describe('Full name of the recipient'),
      recipientBusinessName: z
        .string()
        .optional()
        .describe('Business/company name of the recipient'),
      recipientAddress1: z.string().describe('Recipient street address line 1'),
      recipientAddress2: z.string().optional().describe('Recipient street address line 2'),
      recipientCity: z.string().describe('Recipient city'),
      recipientState: z.string().describe('Recipient state/province'),
      recipientZip: z.string().describe('Recipient postal/ZIP code'),
      recipientCountryId: z
        .number()
        .optional()
        .describe('Recipient country ID (defaults to US)'),

      senderName: z.string().optional().describe('Full name of the sender'),
      senderAddress1: z.string().optional().describe('Sender street address line 1'),
      senderAddress2: z.string().optional().describe('Sender street address line 2'),
      senderCity: z.string().optional().describe('Sender city'),
      senderState: z.string().optional().describe('Sender state/province'),
      senderZip: z.string().optional().describe('Sender postal/ZIP code'),
      senderCountryId: z.number().optional().describe('Sender country ID'),

      giftCardDenominationId: z
        .string()
        .optional()
        .describe('Gift card denomination ID to include with the card'),
      insertId: z
        .string()
        .optional()
        .describe('Physical insert ID (e.g., business card or magnet) to include'),
      creditCardId: z.string().optional().describe('Credit card ID for payment'),
      sendDate: z
        .string()
        .optional()
        .describe('Schedule date in YYYY-MM-DD format. Omit to send immediately.')
    })
  )
  .output(
    z.object({
      orderId: z.string().describe('ID of the created order'),
      status: z.string().describe('Current status of the order')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.sendCard({
      cardId: ctx.input.cardId,
      message: ctx.input.message,
      fontLabel: ctx.input.fontLabel,
      recipientName: ctx.input.recipientName,
      recipientBusinessName: ctx.input.recipientBusinessName,
      recipientAddress1: ctx.input.recipientAddress1,
      recipientAddress2: ctx.input.recipientAddress2,
      recipientCity: ctx.input.recipientCity,
      recipientState: ctx.input.recipientState,
      recipientZip: ctx.input.recipientZip,
      recipientCountryId: ctx.input.recipientCountryId,
      senderName: ctx.input.senderName,
      senderAddress1: ctx.input.senderAddress1,
      senderAddress2: ctx.input.senderAddress2,
      senderCity: ctx.input.senderCity,
      senderState: ctx.input.senderState,
      senderZip: ctx.input.senderZip,
      senderCountryId: ctx.input.senderCountryId,
      denominationId: ctx.input.giftCardDenominationId,
      insertId: ctx.input.insertId,
      creditCardId: ctx.input.creditCardId,
      dateSend: ctx.input.sendDate,
      validateAddress: true
    });

    let orderId = String(result.order_id ?? result.id ?? '');

    return {
      output: {
        orderId,
        status: result.status ?? 'processing'
      },
      message: ctx.input.sendDate
        ? `Card scheduled for **${ctx.input.sendDate}** to **${ctx.input.recipientName}**. Order ID: \`${orderId}\``
        : `Card sent to **${ctx.input.recipientName}**. Order ID: \`${orderId}\``
    };
  })
  .build();
