import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { quickBooksServiceError } from '../lib/errors';
import { createClientFromContext } from '../lib/helpers';
import { spec } from '../spec';

let itemOutputSchema = z.object({
  itemId: z.string().describe('Item ID'),
  name: z.string().describe('Item name'),
  itemType: z.string().optional().describe('Item type (Inventory, Service, NonInventory)'),
  description: z.string().optional().describe('Item description'),
  unitPrice: z.number().optional().describe('Sales price per unit'),
  purchaseCost: z.number().optional().describe('Purchase cost per unit'),
  quantityOnHand: z.number().optional().describe('Current inventory quantity'),
  active: z.boolean().optional().describe('Whether the item is active'),
  syncToken: z.string().describe('Sync token for updates')
});

export let createItem = SlateTool.create(spec, {
  name: 'Create Item',
  key: 'create_item',
  description: `Creates a new product or service item in QuickBooks. Supports inventory items with quantity tracking, service items, and non-inventory items. Configure pricing, accounts, and inventory details.`,
  instructions: [
    'For Inventory type items, incomeAccountId, expenseAccountId, assetAccountId, and quantityOnHand are required.',
    'For Service or NonInventory items, only incomeAccountId is typically required.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Item name (must be unique)'),
      itemType: z.enum(['Inventory', 'Service', 'NonInventory']).describe('Type of item'),
      description: z.string().optional().describe('Sales description'),
      purchaseDescription: z.string().optional().describe('Purchase description'),
      unitPrice: z.number().optional().describe('Sales price per unit'),
      purchaseCost: z.number().optional().describe('Cost when purchased'),
      incomeAccountId: z.string().describe('Income account ID for sales revenue'),
      expenseAccountId: z.string().optional().describe('Expense/COGS account ID'),
      assetAccountId: z
        .string()
        .optional()
        .describe('Inventory asset account ID (required for Inventory type)'),
      quantityOnHand: z
        .number()
        .optional()
        .describe('Starting quantity on hand (required for Inventory type)'),
      sku: z.string().optional().describe('SKU code'),
      taxable: z.boolean().optional().describe('Whether the item is taxable')
    })
  )
  .output(itemOutputSchema)
  .handleInvocation(async ctx => {
    if (ctx.input.itemType === 'Inventory') {
      let missing = [
        ['expenseAccountId', ctx.input.expenseAccountId],
        ['assetAccountId', ctx.input.assetAccountId],
        ['quantityOnHand', ctx.input.quantityOnHand]
      ]
        .filter(([, value]) => value === undefined || value === '')
        .map(([field]) => field);

      if (missing.length > 0) {
        throw quickBooksServiceError(`Inventory items require ${missing.join(', ')}.`);
      }
    }

    let client = createClientFromContext(ctx);

    let itemData: any = {
      Name: ctx.input.name,
      Type: ctx.input.itemType,
      IncomeAccountRef: { value: ctx.input.incomeAccountId }
    };

    if (ctx.input.description) itemData.Description = ctx.input.description;
    if (ctx.input.purchaseDescription) itemData.PurchaseDesc = ctx.input.purchaseDescription;
    if (ctx.input.unitPrice !== undefined) itemData.UnitPrice = ctx.input.unitPrice;
    if (ctx.input.purchaseCost !== undefined) itemData.PurchaseCost = ctx.input.purchaseCost;
    if (ctx.input.expenseAccountId)
      itemData.ExpenseAccountRef = { value: ctx.input.expenseAccountId };
    if (ctx.input.assetAccountId)
      itemData.AssetAccountRef = { value: ctx.input.assetAccountId };
    if (ctx.input.quantityOnHand !== undefined) {
      itemData.QtyOnHand = ctx.input.quantityOnHand;
      itemData.TrackQtyOnHand = true;
      itemData.InvStartDate = new Date().toISOString().split('T')[0];
    }
    if (ctx.input.sku) itemData.Sku = ctx.input.sku;
    if (ctx.input.taxable !== undefined) itemData.Taxable = ctx.input.taxable;

    let item = await client.createItem(itemData);

    return {
      output: {
        itemId: item.Id,
        name: item.Name,
        itemType: item.Type,
        description: item.Description,
        unitPrice: item.UnitPrice,
        purchaseCost: item.PurchaseCost,
        quantityOnHand: item.QtyOnHand,
        active: item.Active,
        syncToken: item.SyncToken
      },
      message: `Created ${item.Type} item **${item.Name}** (ID: ${item.Id})${item.UnitPrice ? ` priced at $${item.UnitPrice}` : ''}.`
    };
  })
  .build();

export let updateItem = SlateTool.create(spec, {
  name: 'Update Item',
  key: 'update_item',
  description: `Updates an existing product or service item. Fetches the current item first to ensure the sync token is correct, then applies updates.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      itemId: z.string().describe('QuickBooks Item ID to update'),
      name: z.string().optional().describe('New item name'),
      description: z.string().optional().describe('New sales description'),
      unitPrice: z.number().optional().describe('New sales price'),
      purchaseCost: z.number().optional().describe('New purchase cost'),
      quantityOnHand: z.number().optional().describe('Updated quantity on hand'),
      active: z.boolean().optional().describe('Whether the item is active'),
      sku: z.string().optional().describe('New SKU code')
    })
  )
  .output(itemOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);
    let existing = await client.getItem(ctx.input.itemId);

    let updateData: any = {
      Id: ctx.input.itemId,
      SyncToken: existing.SyncToken,
      sparse: true
    };

    if (ctx.input.name) updateData.Name = ctx.input.name;
    if (ctx.input.description) updateData.Description = ctx.input.description;
    if (ctx.input.unitPrice !== undefined) updateData.UnitPrice = ctx.input.unitPrice;
    if (ctx.input.purchaseCost !== undefined) updateData.PurchaseCost = ctx.input.purchaseCost;
    if (ctx.input.quantityOnHand !== undefined)
      updateData.QtyOnHand = ctx.input.quantityOnHand;
    if (ctx.input.active !== undefined) updateData.Active = ctx.input.active;
    if (ctx.input.sku) updateData.Sku = ctx.input.sku;

    let item = await client.updateItem(updateData);

    return {
      output: {
        itemId: item.Id,
        name: item.Name,
        itemType: item.Type,
        description: item.Description,
        unitPrice: item.UnitPrice,
        purchaseCost: item.PurchaseCost,
        quantityOnHand: item.QtyOnHand,
        active: item.Active,
        syncToken: item.SyncToken
      },
      message: `Updated item **${item.Name}** (ID: ${item.Id}).`
    };
  })
  .build();
