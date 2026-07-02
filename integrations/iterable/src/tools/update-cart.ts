import { SlateTool } from 'slates';
import { z } from 'zod';
import { IterableClient } from '../lib/client';
import { spec } from '../spec';

let cartItemSchema = z.object({
  itemId: z.string().describe('Unique item/product ID'),
  name: z.string().describe('Item name'),
  price: z.number().describe('Price per unit'),
  quantity: z.number().describe('Number of items'),
  sku: z.string().optional().describe('SKU identifier'),
  description: z.string().optional().describe('Item description'),
  categories: z.array(z.string()).optional().describe('Item categories'),
  imageUrl: z.string().optional().describe('URL of the item image'),
  url: z.string().optional().describe('URL of the item page'),
  itemFields: z
    .record(z.string(), z.any())
    .optional()
    .describe('Additional custom fields for this item')
});

export let updateCart = SlateTool.create(spec, {
  name: 'Update Cart',
  key: 'update_cart',
  description: `Updates the shopping cart for a user in Iterable. Replaces the user's current cart contents with the provided items. Used for cart abandonment campaigns and commerce workflows.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().optional().describe('Email of the user'),
      userId: z.string().optional().describe('User ID'),
      items: z.array(cartItemSchema).describe('Current cart items (replaces the entire cart)'),
      createNewFields: z
        .boolean()
        .optional()
        .describe('If true, creates new fields that do not already exist')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the cart was updated'),
      message: z.string().describe('Response message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new IterableClient({
      token: ctx.auth.token,
      dataCenter: ctx.config.dataCenter
    });

    let items = ctx.input.items.map(item => ({
      id: item.itemId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      sku: item.sku,
      description: item.description,
      categories: item.categories,
      imageUrl: item.imageUrl,
      url: item.url,
      dataFields: item.itemFields
    }));

    let result = await client.updateCart({
      email: ctx.input.email,
      userId: ctx.input.userId,
      items,
      createNewFields: ctx.input.createNewFields
    });

    return {
      output: {
        success: result.code === 'Success',
        message: result.msg || 'Cart updated successfully'
      },
      message: `Updated cart with **${ctx.input.items.length}** item(s) for user **${ctx.input.email || ctx.input.userId}**.`
    };
  })
  .build();
