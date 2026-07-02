import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { xeroServiceError } from '../lib/errors';
import { createClientFromContext } from '../lib/helpers';
import { spec } from '../spec';

let itemOutputSchema = z.object({
  itemId: z.string().optional().describe('Unique Xero item ID'),
  code: z.string().optional().describe('Item code'),
  name: z.string().optional().describe('Item name'),
  description: z.string().optional().describe('Sales description'),
  purchaseDescription: z.string().optional().describe('Purchase description'),
  isSold: z.boolean().optional().describe('Whether the item is sold'),
  isPurchased: z.boolean().optional().describe('Whether the item is purchased'),
  isTrackedAsInventory: z.boolean().optional().describe('Whether inventory is tracked'),
  quantityOnHand: z.number().optional().describe('Current quantity on hand'),
  totalCostPool: z.number().optional().describe('Total cost pool'),
  salesUnitPrice: z.number().optional().describe('Default sales unit price'),
  salesAccountCode: z.string().optional().describe('Sales account code'),
  salesTaxType: z.string().optional().describe('Sales tax type'),
  purchaseUnitPrice: z.number().optional().describe('Default purchase unit price'),
  purchaseAccountCode: z.string().optional().describe('Purchase account code'),
  purchaseTaxType: z.string().optional().describe('Purchase tax type'),
  updatedDate: z.string().optional().describe('Last updated timestamp')
});

let mapItem = (item: any) => ({
  itemId: item.ItemID,
  code: item.Code,
  name: item.Name,
  description: item.Description,
  purchaseDescription: item.PurchaseDescription,
  isSold: item.IsSold,
  isPurchased: item.IsPurchased,
  isTrackedAsInventory: item.IsTrackedAsInventory,
  quantityOnHand: item.QuantityOnHand,
  totalCostPool: item.TotalCostPool,
  salesUnitPrice: item.SalesDetails?.UnitPrice,
  salesAccountCode: item.SalesDetails?.AccountCode,
  salesTaxType: item.SalesDetails?.TaxType,
  purchaseUnitPrice: item.PurchaseDetails?.UnitPrice,
  purchaseAccountCode: item.PurchaseDetails?.AccountCode,
  purchaseTaxType: item.PurchaseDetails?.TaxType,
  updatedDate: item.UpdatedDateUTC
});

export let listItems = SlateTool.create(spec, {
  name: 'List Items',
  key: 'list_items',
  description: `Lists inventory items from Xero. Items represent products or services that can be added to invoices, quotes, and purchase orders using item codes.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      where: z.string().optional().describe('Xero API where filter, e.g. `IsSold==true`'),
      order: z.string().optional().describe('Order results, e.g. "Code ASC"'),
      modifiedAfter: z
        .string()
        .optional()
        .describe('Only return items modified after this date (ISO 8601)')
    })
  )
  .output(
    z.object({
      items: z.array(itemOutputSchema).describe('List of items'),
      count: z.number().describe('Number of items returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);

    let result = await client.getItems({
      where: ctx.input.where,
      order: ctx.input.order,
      modifiedAfter: ctx.input.modifiedAfter
    });

    let items = (result.Items || []).map(mapItem);

    return {
      output: { items, count: items.length },
      message: `Found **${items.length}** item(s).`
    };
  })
  .build();

export let createItem = SlateTool.create(spec, {
  name: 'Create Item',
  key: 'create_item',
  description: `Creates a new inventory item in Xero. Items can be used on invoices, quotes, and purchase orders by referencing their item code. Configure sales and purchase pricing separately.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      code: z.string().describe('Unique item code'),
      name: z.string().optional().describe('Item name'),
      description: z.string().optional().describe('Sales description'),
      purchaseDescription: z.string().optional().describe('Purchase description'),
      isSold: z.boolean().optional().describe('Whether the item can be sold'),
      isPurchased: z.boolean().optional().describe('Whether the item can be purchased'),
      salesUnitPrice: z.number().optional().describe('Default sales unit price'),
      salesAccountCode: z.string().optional().describe('Sales account code'),
      salesTaxType: z.string().optional().describe('Sales tax type'),
      purchaseUnitPrice: z.number().optional().describe('Default purchase unit price'),
      purchaseAccountCode: z.string().optional().describe('Purchase account code'),
      purchaseTaxType: z.string().optional().describe('Purchase tax type'),
      isTrackedAsInventory: z.boolean().optional().describe('Track as inventory'),
      inventoryAssetAccountCode: z
        .string()
        .optional()
        .describe('Inventory asset account code (required if tracking inventory)')
    })
  )
  .output(itemOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);

    let itemData: Record<string, any> = {
      Code: ctx.input.code
    };

    if (ctx.input.name) itemData.Name = ctx.input.name;
    if (ctx.input.description) itemData.Description = ctx.input.description;
    if (ctx.input.purchaseDescription)
      itemData.PurchaseDescription = ctx.input.purchaseDescription;
    if (ctx.input.isSold !== undefined) itemData.IsSold = ctx.input.isSold;
    if (ctx.input.isPurchased !== undefined) itemData.IsPurchased = ctx.input.isPurchased;
    if (ctx.input.isTrackedAsInventory !== undefined)
      itemData.IsTrackedAsInventory = ctx.input.isTrackedAsInventory;
    if (ctx.input.inventoryAssetAccountCode)
      itemData.InventoryAssetAccountCode = ctx.input.inventoryAssetAccountCode;

    if (
      ctx.input.salesUnitPrice !== undefined ||
      ctx.input.salesAccountCode ||
      ctx.input.salesTaxType
    ) {
      itemData.SalesDetails = {};
      if (ctx.input.salesUnitPrice !== undefined)
        itemData.SalesDetails.UnitPrice = ctx.input.salesUnitPrice;
      if (ctx.input.salesAccountCode)
        itemData.SalesDetails.AccountCode = ctx.input.salesAccountCode;
      if (ctx.input.salesTaxType) itemData.SalesDetails.TaxType = ctx.input.salesTaxType;
    }

    if (
      ctx.input.purchaseUnitPrice !== undefined ||
      ctx.input.purchaseAccountCode ||
      ctx.input.purchaseTaxType
    ) {
      itemData.PurchaseDetails = {};
      if (ctx.input.purchaseUnitPrice !== undefined)
        itemData.PurchaseDetails.UnitPrice = ctx.input.purchaseUnitPrice;
      if (ctx.input.purchaseAccountCode)
        itemData.PurchaseDetails.AccountCode = ctx.input.purchaseAccountCode;
      if (ctx.input.purchaseTaxType)
        itemData.PurchaseDetails.TaxType = ctx.input.purchaseTaxType;
    }

    let item = await client.createItem(itemData);
    let output = mapItem(item);

    return {
      output,
      message: `Created item **${output.code}**${output.name ? ` — ${output.name}` : ''}.`
    };
  })
  .build();

export let updateItem = SlateTool.create(spec, {
  name: 'Update Item',
  key: 'update_item',
  description: `Updates an existing inventory item in Xero. Can modify name, description, pricing, and other details.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      itemId: z.string().describe('Xero item ID to update'),
      code: z.string().optional().describe('Updated item code'),
      name: z.string().optional().describe('Updated name'),
      description: z.string().optional().describe('Updated sales description'),
      purchaseDescription: z.string().optional().describe('Updated purchase description'),
      salesUnitPrice: z.number().optional().describe('Updated sales unit price'),
      salesAccountCode: z.string().optional().describe('Updated sales account code'),
      purchaseUnitPrice: z.number().optional().describe('Updated purchase unit price'),
      purchaseAccountCode: z.string().optional().describe('Updated purchase account code')
    })
  )
  .output(itemOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);

    let updateData: Record<string, any> = {};
    if (ctx.input.code) updateData.Code = ctx.input.code;
    if (ctx.input.name) updateData.Name = ctx.input.name;
    if (ctx.input.description) updateData.Description = ctx.input.description;
    if (ctx.input.purchaseDescription)
      updateData.PurchaseDescription = ctx.input.purchaseDescription;

    if (ctx.input.salesUnitPrice !== undefined || ctx.input.salesAccountCode) {
      updateData.SalesDetails = {};
      if (ctx.input.salesUnitPrice !== undefined)
        updateData.SalesDetails.UnitPrice = ctx.input.salesUnitPrice;
      if (ctx.input.salesAccountCode)
        updateData.SalesDetails.AccountCode = ctx.input.salesAccountCode;
    }

    if (ctx.input.purchaseUnitPrice !== undefined || ctx.input.purchaseAccountCode) {
      updateData.PurchaseDetails = {};
      if (ctx.input.purchaseUnitPrice !== undefined)
        updateData.PurchaseDetails.UnitPrice = ctx.input.purchaseUnitPrice;
      if (ctx.input.purchaseAccountCode)
        updateData.PurchaseDetails.AccountCode = ctx.input.purchaseAccountCode;
    }

    if (!updateData.Code) {
      let existing = await client.getItem(ctx.input.itemId);
      if (!existing.Code) {
        throw xeroServiceError('Existing Xero item did not include a code to preserve.');
      }
      updateData.Code = existing.Code;
    }

    let item = await client.updateItem(ctx.input.itemId, updateData);
    let output = mapItem(item);

    return {
      output,
      message: `Updated item **${output.code}**${output.name ? ` — ${output.name}` : ''}.`
    };
  })
  .build();
