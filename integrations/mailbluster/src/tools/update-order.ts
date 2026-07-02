import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateOrder = SlateTool.create(spec, {
  name: 'Update Order',
  key: 'update_order',
  description: `Updates an existing order by its ID. You can modify the customer info, currency, total price, items, or campaign attribution. Only provided fields are updated.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      orderId: z.string().describe('ID of the order to update'),
      customerEmail: z.string().optional().describe('Updated customer email address'),
      customerFirstName: z.string().optional().describe('Updated customer first name'),
      customerLastName: z.string().optional().describe('Updated customer last name'),
      campaignId: z
        .string()
        .optional()
        .describe('Updated campaign ID for revenue attribution'),
      currency: z.string().optional().describe('Updated currency code'),
      totalPrice: z.number().optional().describe('Updated total price'),
      items: z
        .array(
          z.object({
            productId: z.string().describe('Product ID'),
            name: z.string().describe('Product name'),
            price: z.number().describe('Product price'),
            quantity: z.number().describe('Quantity')
          })
        )
        .optional()
        .describe('Updated list of order items')
    })
  )
  .output(
    z.object({
      orderId: z.string().describe('ID of the updated order'),
      customerEmail: z.string().describe('Customer email address'),
      campaignId: z.string().nullable().describe('Attributed campaign ID'),
      currency: z.string().describe('Currency code'),
      totalPrice: z.number().describe('Total price'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let { orderId, items, ...rest } = ctx.input;

    let updateInput: Record<string, any> = { ...rest };
    if (items) {
      updateInput.items = items.map(item => ({
        id: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      }));
    }

    let order = await client.updateOrder(orderId, updateInput);

    return {
      output: {
        orderId: order.id,
        customerEmail: order.customer?.email || '',
        campaignId: order.campaignId,
        currency: order.currency,
        totalPrice: order.totalPrice,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      },
      message: `Order **${order.id}** updated successfully.`
    };
  })
  .build();
