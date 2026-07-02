import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let editOrder = SlateTool.create(spec, {
  name: 'Edit Order',
  key: 'edit_order',
  description: `Update an existing order in Simla.com. Modify status, line items, delivery, payments, customer info, custom fields, and more. Only provided fields will be updated.`,
  instructions: [
    'When editing items, the entire items array is replaced. Include all items you want to keep.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      orderId: z.string().describe('The order ID to edit'),
      lookupBy: z
        .enum(['id', 'externalId'])
        .default('id')
        .describe('Whether to look up by internal ID or external ID'),
      status: z.string().optional().describe('New status code'),
      orderType: z.string().optional().describe('Order type code'),
      orderMethod: z.string().optional().describe('Order method code'),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      items: z
        .array(
          z.object({
            itemId: z.number().optional().describe('Existing item ID (for updates)'),
            offerId: z.number().optional().describe('Trade offer internal ID'),
            offerExternalId: z.string().optional().describe('Trade offer external ID'),
            initialPrice: z.number().describe('Item price per unit'),
            quantity: z.number().describe('Item quantity'),
            discountManualAmount: z.number().optional(),
            discountManualPercent: z.number().optional(),
            vatRate: z.string().optional(),
            comment: z.string().optional()
          })
        )
        .optional()
        .describe('Order line items (replaces all existing items)'),
      delivery: z
        .object({
          code: z.string().optional(),
          cost: z.number().optional(),
          date: z.string().optional(),
          address: z
            .object({
              countryIso: z.string().optional(),
              region: z.string().optional(),
              city: z.string().optional(),
              street: z.string().optional(),
              building: z.string().optional(),
              flat: z.string().optional(),
              index: z.string().optional(),
              text: z.string().optional()
            })
            .optional()
        })
        .optional()
        .describe('Delivery details'),
      discountManualAmount: z.number().optional(),
      discountManualPercent: z.number().optional(),
      managerId: z.number().optional(),
      customerComment: z.string().optional(),
      managerComment: z.string().optional(),
      statusComment: z.string().optional().describe('Comment for the status change'),
      shipmentDate: z.string().optional(),
      shipped: z.boolean().optional(),
      customFields: z.record(z.string(), z.any()).optional(),
      tags: z
        .array(
          z.object({
            name: z.string()
          })
        )
        .optional()
    })
  )
  .output(
    z.object({
      orderId: z.number().describe('Internal ID of the edited order')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      site: ctx.config.site
    });

    let { orderId, lookupBy, ...orderData } = ctx.input;

    let mappedData: Record<string, any> = { ...orderData };

    if (ctx.input.items) {
      mappedData.items = ctx.input.items.map(item => ({
        id: item.itemId,
        offer: {
          id: item.offerId,
          externalId: item.offerExternalId
        },
        initialPrice: item.initialPrice,
        quantity: item.quantity,
        discountManualAmount: item.discountManualAmount,
        discountManualPercent: item.discountManualPercent,
        vatRate: item.vatRate,
        comment: item.comment
      }));
    }

    let result = await client.editOrder(orderId, mappedData, lookupBy);

    return {
      output: {
        orderId: result.orderId
      },
      message: `Updated order **${result.orderId}**.`
    };
  })
  .build();
