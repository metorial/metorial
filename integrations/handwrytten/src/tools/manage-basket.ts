import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let recipientAddressSchema = z.object({
  toFirstName: z.string().optional().describe('Recipient first name'),
  toLastName: z.string().optional().describe('Recipient last name'),
  toBusinessName: z.string().optional().describe('Recipient business name'),
  toAddress1: z.string().describe('Recipient street address line 1'),
  toAddress2: z.string().optional().describe('Recipient street address line 2'),
  toCity: z.string().describe('Recipient city'),
  toState: z.string().describe('Recipient state/province'),
  toZip: z.string().describe('Recipient postal/ZIP code'),
  toCountryId: z.number().optional().describe('Recipient country ID')
});

export let manageBasket = SlateTool.create(spec, {
  name: 'Manage Basket',
  key: 'manage_basket',
  description: `Add orders to the basket for batch processing, view the current basket, send all basket orders, or clear the basket. Use this when sending multiple cards at once — add each card to the basket, then send all at once.`,
  instructions: [
    'To add an order: set action to "add" and provide card, message, font, and recipient details.',
    'To view basket: set action to "view".',
    'To send all: set action to "send". Optionally provide a creditCardId.',
    'To clear: set action to "clear".',
    'You can specify recipients by addressId (from address book) or inline addresses.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['add', 'view', 'send', 'clear']).describe('Basket operation to perform'),

      cardId: z.string().optional().describe('Card design ID (for add)'),
      message: z.string().optional().describe('Handwritten message text (for add)'),
      fontLabel: z.string().optional().describe('Handwriting style font label (for add)'),
      returnAddressId: z
        .string()
        .optional()
        .describe('Return address ID from address book (for add)'),
      addressId: z
        .string()
        .optional()
        .describe('Recipient address ID from address book (for add)'),
      recipients: z
        .array(recipientAddressSchema)
        .optional()
        .describe('Inline recipient addresses (for add, if not using addressId)'),
      giftCardDenominationId: z
        .string()
        .optional()
        .describe('Gift card denomination ID (for add)'),
      insertId: z.string().optional().describe('Physical insert ID (for add)'),
      sendDate: z.string().optional().describe('Scheduled send date YYYY-MM-DD (for add)'),

      creditCardId: z.string().optional().describe('Credit card ID for payment (for send)')
    })
  )
  .output(
    z.object({
      orderId: z.string().optional().describe('ID of the basket order (for add)'),
      basketItemCount: z.number().optional().describe('Number of items in the basket'),
      orders: z.array(z.any()).optional().describe('Basket orders (for view/send)'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action } = ctx.input;

    if (action === 'add') {
      if (!ctx.input.cardId || !ctx.input.message || !ctx.input.fontLabel) {
        throw new Error('cardId, message, and fontLabel are required to add to basket');
      }
      let result = await client.addToBasket({
        cardId: ctx.input.cardId,
        message: ctx.input.message,
        font: ctx.input.fontLabel,
        returnAddressId: ctx.input.returnAddressId,
        addressId: ctx.input.addressId,
        addresses: ctx.input.recipients,
        denominationId: ctx.input.giftCardDenominationId,
        insertId: ctx.input.insertId,
        dateSend: ctx.input.sendDate
      });
      let orderId = String(result.order_id ?? result.id ?? '');
      return {
        output: { orderId, success: true },
        message: `Added order to basket. Order ID: \`${orderId}\``
      };
    }

    if (action === 'view') {
      let [basket, count] = await Promise.all([client.getBasket(), client.getBasketCount()]);
      let orders = basket.orders ?? basket.items ?? basket.data ?? [];
      let itemCount = count.count ?? count.total ?? orders.length;
      return {
        output: { orders, basketItemCount: Number(itemCount), success: true },
        message: `Basket contains **${itemCount}** item(s).`
      };
    }

    if (action === 'send') {
      let result = await client.sendBasket(ctx.input.creditCardId);
      let orders = result.items ? Object.values(result.items) : [];
      return {
        output: { orders: orders as any[], success: true },
        message: `Sent **${orders.length}** order(s) from basket.`
      };
    }

    if (action === 'clear') {
      await client.clearBasket();
      return {
        output: { success: true },
        message: 'Basket cleared.'
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
