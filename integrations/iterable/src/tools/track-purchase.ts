import { SlateTool } from 'slates';
import { z } from 'zod';
import { IterableClient } from '../lib/client';
import { requireArrayField, requireUserIdentity } from '../lib/validation';
import { spec } from '../spec';

let commerceItemSchema = z.object({
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

export let trackPurchase = SlateTool.create(spec, {
  name: 'Track Purchase',
  key: 'track_purchase',
  description: `Records a purchase event for a user in Iterable. Tracks commerce items with prices, quantities, and custom metadata. Unlocks commerce-specific campaign metrics and segmentation.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().optional().describe('Email of the purchasing user'),
      userId: z.string().optional().describe('User ID of the purchasing user'),
      items: z.array(commerceItemSchema).describe('List of purchased items'),
      total: z.number().describe('Total purchase amount'),
      campaignId: z.number().optional().describe('Campaign ID to attribute this purchase to'),
      templateId: z.number().optional().describe('Template ID to attribute this purchase to'),
      createdAt: z
        .number()
        .optional()
        .describe('Unix timestamp (seconds) of when the purchase occurred'),
      createNewFields: z
        .boolean()
        .optional()
        .describe('If true, creates new fields that do not already exist'),
      purchaseFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional custom fields for the purchase event')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the purchase was tracked'),
      message: z.string().describe('Response message')
    })
  )
  .handleInvocation(async ctx => {
    requireUserIdentity(ctx.input);
    requireArrayField(ctx.input.items, 'items');

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

    let result = await client.trackPurchase({
      email: ctx.input.email,
      userId: ctx.input.userId,
      items,
      total: ctx.input.total,
      campaignId: ctx.input.campaignId,
      templateId: ctx.input.templateId,
      dataFields: ctx.input.purchaseFields,
      createdAt: ctx.input.createdAt,
      createNewFields: ctx.input.createNewFields
    });

    return {
      output: {
        success: result.code === 'Success',
        message: result.msg || 'Purchase tracked successfully'
      },
      message: `Tracked purchase of **${ctx.input.items.length}** item(s) totaling **${ctx.input.total}** for user **${ctx.input.email || ctx.input.userId}**.`
    };
  })
  .build();
