import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateOrder = SlateTool.create(spec, {
  name: 'Update Order',
  key: 'update_order',
  description: `Update order details, add notes, or mark a postal order as posted. Supports updating purchaser info, adding annotations, and marking physical gift cards as shipped.`,
  instructions: [
    'To add a note, provide the **note** field. Notes are limited to 500 characters.',
    'To mark a postal order as posted, set **markAsPosted** to true.'
  ]
})
  .input(
    z.object({
      orderId: z.string().describe('The order ID to update'),
      purchaserEmail: z.string().optional().describe('New purchaser email'),
      purchaserName: z.string().optional().describe('New purchaser name'),
      note: z.string().optional().describe('Add a note to the order (max 500 characters)'),
      markAsPosted: z.boolean().optional().describe('Mark a postal order as posted/shipped'),
      codes: z
        .array(
          z.object({
            oldCode: z.string().describe('Existing gift card code in the order'),
            newCode: z
              .string()
              .describe(
                'Replacement code, or the old code to keep it unchanged (at least 3 characters)'
              )
          })
        )
        .optional()
        .describe(
          'For markAsPosted: code mappings for every card in the order. Omit to keep all existing codes.'
        )
    })
  )
  .output(
    z
      .object({
        orderId: z.string().describe('Order ID'),
        orderNumber: z.string().describe('Order number'),
        purchaserEmail: z.string().describe('Purchaser email'),
        purchaserName: z.string().describe('Purchaser name')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    if (ctx.input.note !== undefined && ctx.input.note.length > 500) {
      throw createApiServiceError('Order notes must be no more than 500 characters.');
    }
    if (ctx.input.codes && !ctx.input.markAsPosted) {
      throw createApiServiceError('Set markAsPosted to true when providing codes.');
    }
    if (ctx.input.codes?.some(code => code.newCode.length < 3)) {
      throw createApiServiceError('Each newCode must contain at least 3 characters.');
    }
    let client = new Client({
      token: ctx.auth.token,
      testMode: ctx.config.testMode
    });

    let postedCodes = ctx.input.codes;
    if (ctx.input.markAsPosted) {
      let order = await client.getOrder(ctx.input.orderId);
      let existingCodes: string[] = order.giftCards.map((card: { code: string }) => card.code);
      if (postedCodes) {
        let suppliedCodes = postedCodes.map(code => code.oldCode);
        if (
          suppliedCodes.length !== existingCodes.length ||
          new Set(suppliedCodes).size !== suppliedCodes.length ||
          existingCodes.some(code => !suppliedCodes.includes(code))
        ) {
          throw createApiServiceError(
            'codes must include exactly one mapping for every gift card in the order. Call get_order to discover its codes.'
          );
        }
      } else {
        postedCodes = existingCodes.map(code => ({ oldCode: code, newCode: code }));
      }
    }
    let actions: string[] = [];

    // Update purchaser info via PATCH
    let patches: Array<{ op: string; path: string; value: any }> = [];
    if (ctx.input.purchaserEmail !== undefined) {
      patches.push({
        op: 'replace',
        path: '/purchaseremail',
        value: ctx.input.purchaserEmail
      });
    }
    if (ctx.input.purchaserName !== undefined) {
      patches.push({ op: 'replace', path: '/purchasername', value: ctx.input.purchaserName });
    }
    if (patches.length > 0) {
      await client.updateOrder(ctx.input.orderId, patches);
      actions.push('updated purchaser info');
    }

    // Add note
    if (ctx.input.note) {
      await client.addOrderNote(ctx.input.orderId, ctx.input.note);
      actions.push('added note');
    }

    // Mark as posted
    if (ctx.input.markAsPosted) {
      await client.markOrderPosted(ctx.input.orderId, { codes: postedCodes ?? [] });
      actions.push('marked as posted');
    }

    let order = await client.getOrder(ctx.input.orderId);

    return {
      output: {
        ...order,
        orderId: order.id
      },
      message:
        actions.length > 0
          ? `Updated order **#${order.orderNumber}**: ${actions.join(', ')}`
          : 'No fields were provided to update.'
    };
  })
  .build();
