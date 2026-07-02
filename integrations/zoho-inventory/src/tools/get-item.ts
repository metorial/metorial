import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getItem = SlateTool.create(spec, {
  name: 'Get Item',
  key: 'get_item',
  description: `Retrieve detailed information about a specific item by its ID, including pricing, stock levels, tax configuration, and warehouse-level stock details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      itemId: z.string().describe('ID of the item to retrieve')
    })
  )
  .output(
    z.object({
      itemId: z.string().describe('Item ID'),
      name: z.string().describe('Item name'),
      sku: z.string().optional().describe('SKU'),
      rate: z.number().optional().describe('Sales price'),
      purchaseRate: z.number().optional().describe('Purchase price'),
      status: z.string().optional().describe('Item status'),
      stockOnHand: z.number().optional().describe('Current stock on hand'),
      unit: z.string().optional().describe('Unit of measurement'),
      itemType: z.string().optional().describe('Item type'),
      productType: z.string().optional().describe('Product type'),
      description: z.string().optional().describe('Sales description'),
      purchaseDescription: z.string().optional().describe('Purchase description'),
      taxName: z.string().optional().describe('Applied tax name'),
      taxPercentage: z.number().optional().describe('Tax percentage'),
      upc: z.string().optional().describe('Universal Product Code'),
      ean: z.string().optional().describe('European Article Number'),
      isbn: z.string().optional().describe('International Standard Book Number'),
      reorderLevel: z.number().optional().describe('Reorder level'),
      vendorName: z.string().optional().describe('Preferred vendor name'),
      createdTime: z.string().optional().describe('When the item was created'),
      lastModifiedTime: z.string().optional().describe('When the item was last modified')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.getItem(ctx.input.itemId);
    let item = result.item;

    return {
      output: {
        itemId: String(item.item_id),
        name: item.name,
        sku: item.sku ?? undefined,
        rate: item.rate ?? undefined,
        purchaseRate: item.purchase_rate ?? undefined,
        status: item.status ?? undefined,
        stockOnHand: item.stock_on_hand ?? undefined,
        unit: item.unit ?? undefined,
        itemType: item.item_type ?? undefined,
        productType: item.product_type ?? undefined,
        description: item.description ?? undefined,
        purchaseDescription: item.purchase_description ?? undefined,
        taxName: item.tax_name ?? undefined,
        taxPercentage: item.tax_percentage ?? undefined,
        upc: item.upc ?? undefined,
        ean: item.ean ?? undefined,
        isbn: item.isbn ?? undefined,
        reorderLevel: item.reorder_level ?? undefined,
        vendorName: item.vendor_name ?? undefined,
        createdTime: item.created_time ?? undefined,
        lastModifiedTime: item.last_modified_time ?? undefined
      },
      message: `Retrieved item **${item.name}** (${item.item_id}). Stock on hand: ${item.stock_on_hand ?? 'N/A'}.`
    };
  })
  .build();
