import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let _lineItemSchema = z
  .object({
    name: z.string().describe('Item name'),
    sku: z.string().optional().describe('Stock Keeping Unit'),
    rate: z.number().optional().describe('Sales price per unit'),
    purchaseRate: z.number().optional().describe('Purchase price per unit'),
    unit: z.string().optional().describe('Unit of measurement'),
    itemType: z
      .enum(['inventory', 'sales', 'purchases', 'sales_and_purchases'])
      .optional()
      .describe('Item type'),
    productType: z.enum(['goods', 'service']).optional().describe('Product type'),
    description: z.string().optional().describe('Item description for sales'),
    purchaseDescription: z.string().optional().describe('Item description for purchases'),
    taxId: z.string().optional().describe('Tax ID to apply'),
    upc: z.string().optional().describe('Universal Product Code'),
    ean: z.string().optional().describe('European Article Number'),
    isbn: z.string().optional().describe('International Standard Book Number'),
    reorderLevel: z.number().optional().describe('Minimum stock level before reorder'),
    initialStock: z.number().optional().describe('Initial stock quantity (only at creation)'),
    initialStockRate: z.number().optional().describe('Cost per unit of initial stock'),
    vendorId: z.string().optional().describe('Preferred vendor ID'),
    isReturnable: z.boolean().optional().describe('Whether the item is returnable')
  })
  .partial()
  .required({ name: true });

export let manageItem = SlateTool.create(spec, {
  name: 'Manage Item',
  key: 'manage_item',
  description: `Create or update an inventory item in Zoho Inventory. Supports goods and services with attributes like SKU, UPC, pricing, tax, reorder levels, and vendor association.
Use without an **itemId** to create a new item, or with an **itemId** to update an existing one.`,
  instructions: [
    'To create an item, provide at least a name. Rate and other fields are optional.',
    'To update an item, provide the itemId along with fields to change.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      itemId: z
        .string()
        .optional()
        .describe('ID of the item to update. Omit to create a new item.'),
      name: z.string().optional().describe('Item name (required for creation)'),
      sku: z.string().optional().describe('Stock Keeping Unit'),
      rate: z.number().optional().describe('Sales price per unit'),
      purchaseRate: z.number().optional().describe('Purchase price per unit'),
      unit: z.string().optional().describe('Unit of measurement (e.g., pcs, kg, hrs)'),
      itemType: z
        .enum(['inventory', 'sales', 'purchases', 'sales_and_purchases'])
        .optional()
        .describe('Item type'),
      productType: z.enum(['goods', 'service']).optional().describe('Product type'),
      description: z.string().optional().describe('Item description for sales transactions'),
      purchaseDescription: z
        .string()
        .optional()
        .describe('Item description for purchase transactions'),
      taxId: z.string().optional().describe('Tax ID to apply to this item'),
      upc: z.string().optional().describe('Universal Product Code'),
      ean: z.string().optional().describe('European Article Number'),
      isbn: z.string().optional().describe('International Standard Book Number'),
      reorderLevel: z.number().optional().describe('Minimum stock level before reorder alert'),
      initialStock: z
        .number()
        .optional()
        .describe('Initial stock quantity (only at creation)'),
      initialStockRate: z.number().optional().describe('Cost per unit of initial stock'),
      vendorId: z.string().optional().describe('Preferred vendor contact ID'),
      isReturnable: z.boolean().optional().describe('Whether the item is returnable'),
      status: z
        .enum(['active', 'inactive'])
        .optional()
        .describe('Set item status to active or inactive')
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
      productType: z.string().optional().describe('Product type')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let body: Record<string, any> = {};
    if (ctx.input.name !== undefined) body.name = ctx.input.name;
    if (ctx.input.sku !== undefined) body.sku = ctx.input.sku;
    if (ctx.input.rate !== undefined) body.rate = ctx.input.rate;
    if (ctx.input.purchaseRate !== undefined) body.purchase_rate = ctx.input.purchaseRate;
    if (ctx.input.unit !== undefined) body.unit = ctx.input.unit;
    if (ctx.input.itemType !== undefined) body.item_type = ctx.input.itemType;
    if (ctx.input.productType !== undefined) body.product_type = ctx.input.productType;
    if (ctx.input.description !== undefined) body.description = ctx.input.description;
    if (ctx.input.purchaseDescription !== undefined)
      body.purchase_description = ctx.input.purchaseDescription;
    if (ctx.input.taxId !== undefined) body.tax_id = ctx.input.taxId;
    if (ctx.input.upc !== undefined) body.upc = ctx.input.upc;
    if (ctx.input.ean !== undefined) body.ean = ctx.input.ean;
    if (ctx.input.isbn !== undefined) body.isbn = ctx.input.isbn;
    if (ctx.input.reorderLevel !== undefined) body.reorder_level = ctx.input.reorderLevel;
    if (ctx.input.initialStock !== undefined) body.initial_stock = ctx.input.initialStock;
    if (ctx.input.initialStockRate !== undefined)
      body.initial_stock_rate = ctx.input.initialStockRate;
    if (ctx.input.vendorId !== undefined) body.vendor_id = ctx.input.vendorId;
    if (ctx.input.isReturnable !== undefined) body.is_returnable = ctx.input.isReturnable;

    let result: any;
    let action: string;

    if (ctx.input.itemId) {
      result = await client.updateItem(ctx.input.itemId, body);
      action = 'updated';

      if (ctx.input.status === 'active') {
        await client.markItemActive(ctx.input.itemId);
      } else if (ctx.input.status === 'inactive') {
        await client.markItemInactive(ctx.input.itemId);
      }
    } else {
      result = await client.createItem(body);
      action = 'created';
    }

    let item = result.item;

    if (!ctx.input.itemId && ctx.input.status && item?.item_id) {
      if (ctx.input.status === 'active') {
        await client.markItemActive(item.item_id);
      } else if (ctx.input.status === 'inactive') {
        await client.markItemInactive(item.item_id);
      }
    }

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
        productType: item.product_type ?? undefined
      },
      message: `Item **${item.name}** (${item.item_id}) ${action} successfully.`
    };
  })
  .build();
