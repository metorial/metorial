import { SlateTool } from 'slates';
import { z } from 'zod';
import { SevdeskClient } from '../lib/client';
import { spec } from '../spec';

export let createPart = SlateTool.create(spec, {
  name: 'Create Part',
  key: 'create_part',
  description: `Create a new part (product or service) in the sevDesk inventory. Parts can be used as line items in invoices and orders.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the part'),
      partNumber: z.string().optional().describe('Part/SKU number'),
      stock: z.number().optional().describe('Initial stock quantity'),
      price: z.number().optional().describe('Unit price (net)'),
      priceGross: z.number().optional().describe('Unit price (gross)'),
      taxRate: z.number().optional().describe('Tax rate percentage'),
      unityId: z.string().optional().describe('Unity ID for unit of measure'),
      text: z.string().optional().describe('Description text for the part'),
      isStockEnabled: z.boolean().optional().describe('Whether stock tracking is enabled'),
      stockAvailable: z.number().optional().describe('Available stock amount'),
      categoryId: z.string().optional().describe('Category ID')
    })
  )
  .output(
    z.object({
      partId: z.string().describe('ID of the created part'),
      name: z.string().describe('Name of the part'),
      partNumber: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new SevdeskClient({ token: ctx.auth.token });

    let data: Record<string, any> = {
      name: ctx.input.name
    };

    if (ctx.input.partNumber) data.partNumber = ctx.input.partNumber;
    if (ctx.input.stock !== undefined) data.stock = ctx.input.stock;
    if (ctx.input.price !== undefined) data.price = ctx.input.price;
    if (ctx.input.priceGross !== undefined) data.priceGross = ctx.input.priceGross;
    if (ctx.input.taxRate !== undefined) data.taxRate = ctx.input.taxRate;
    if (ctx.input.unityId) data.unity = { id: ctx.input.unityId, objectName: 'Unity' };
    if (ctx.input.text) data.text = ctx.input.text;
    if (ctx.input.isStockEnabled !== undefined) data.stockEnabled = ctx.input.isStockEnabled;
    if (ctx.input.stockAvailable !== undefined) data.stockAvailable = ctx.input.stockAvailable;
    if (ctx.input.categoryId)
      data.category = { id: ctx.input.categoryId, objectName: 'Category' };

    let part = await client.createPart(data);

    return {
      output: {
        partId: String(part.id),
        name: part.name ?? ctx.input.name,
        partNumber: part.partNumber ?? undefined
      },
      message: `Created part **${ctx.input.name}** (ID: ${part.id}).`
    };
  })
  .build();
