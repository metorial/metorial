import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listItemsTool = SlateTool.create(spec, {
  name: 'List Items',
  key: 'list_items',
  description: `Search and list products and services (items) that can be used in invoices, estimates, and other transactions.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      searchText: z.string().optional().describe('Search by item name or SKU'),
      filterBy: z.enum(['Status.All', 'Status.Active', 'Status.Inactive']).optional(),
      page: z.number().optional().default(1),
      perPage: z.number().optional().default(200)
    })
  )
  .output(
    z.object({
      items: z.array(
        z.object({
          itemId: z.string(),
          name: z.string().optional(),
          description: z.string().optional(),
          rate: z.number().optional(),
          sku: z.string().optional(),
          unit: z.string().optional(),
          status: z.string().optional(),
          taxId: z.string().optional(),
          taxName: z.string().optional(),
          productType: z.string().optional()
        })
      ),
      pageContext: z
        .object({
          page: z.number(),
          perPage: z.number(),
          hasMorePage: z.boolean()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let query: Record<string, any> = { page: ctx.input.page, per_page: ctx.input.perPage };
    if (ctx.input.searchText) query.search_text = ctx.input.searchText;
    if (ctx.input.filterBy) query.filter_by = ctx.input.filterBy;

    let resp = await client.listItems(query);
    let items = (resp.items || []).map((i: any) => ({
      itemId: i.item_id,
      name: i.name,
      description: i.description,
      rate: i.rate,
      sku: i.sku,
      unit: i.unit,
      status: i.status,
      taxId: i.tax_id,
      taxName: i.tax_name,
      productType: i.product_type
    }));

    let pageContext = resp.page_context
      ? {
          page: resp.page_context.page,
          perPage: resp.page_context.per_page,
          hasMorePage: resp.page_context.has_more_page
        }
      : undefined;

    return {
      output: { items, pageContext },
      message: `Found **${items.length}** item(s) on page ${ctx.input.page}.`
    };
  })
  .build();

export let createItemTool = SlateTool.create(spec, {
  name: 'Create Item',
  key: 'create_item',
  description: `Create a new product or service item that can be used across invoices, estimates, bills, and other transactions.`
})
  .input(
    z.object({
      name: z.string().describe('Item name'),
      description: z.string().optional(),
      rate: z.number().optional().describe('Default selling price'),
      purchaseRate: z.number().optional().describe('Default purchase/cost price'),
      sku: z.string().optional().describe('Stock Keeping Unit'),
      unit: z.string().optional().describe('Unit of measurement (e.g. qty, hrs, kg)'),
      taxId: z.string().optional(),
      productType: z.enum(['goods', 'service']).optional().default('goods'),
      accountId: z.string().optional().describe('Sales account ID'),
      purchaseAccountId: z.string().optional().describe('Purchase account ID')
    })
  )
  .output(
    z.object({
      itemId: z.string(),
      name: z.string().optional(),
      rate: z.number().optional(),
      status: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let input = ctx.input;

    let payload: Record<string, any> = { name: input.name };
    if (input.description) payload.description = input.description;
    if (input.rate !== undefined) payload.rate = input.rate;
    if (input.purchaseRate !== undefined) payload.purchase_rate = input.purchaseRate;
    if (input.sku) payload.sku = input.sku;
    if (input.unit) payload.unit = input.unit;
    if (input.taxId) payload.tax_id = input.taxId;
    if (input.productType) payload.product_type = input.productType;
    if (input.accountId) payload.account_id = input.accountId;
    if (input.purchaseAccountId) payload.purchase_account_id = input.purchaseAccountId;

    let resp = await client.createItem(payload);
    let item = resp.item;

    return {
      output: {
        itemId: item.item_id,
        name: item.name,
        rate: item.rate,
        status: item.status
      },
      message: `Created item **${item.name}** with rate ${item.rate}.`
    };
  })
  .build();

export let updateItemTool = SlateTool.create(spec, {
  name: 'Update Item',
  key: 'update_item',
  description: `Update an existing item's details, pricing, or status. Supports marking items as active or inactive.`
})
  .input(
    z.object({
      itemId: z.string().describe('ID of the item to update'),
      name: z.string().optional(),
      description: z.string().optional(),
      rate: z.number().optional(),
      purchaseRate: z.number().optional(),
      sku: z.string().optional(),
      unit: z.string().optional(),
      taxId: z.string().optional(),
      markAs: z.enum(['active', 'inactive']).optional().describe('Change item status')
    })
  )
  .output(
    z.object({
      itemId: z.string(),
      name: z.string().optional(),
      rate: z.number().optional(),
      status: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let input = ctx.input;

    if (input.markAs === 'active') await client.markItemActive(input.itemId);
    else if (input.markAs === 'inactive') await client.markItemInactive(input.itemId);

    let payload: Record<string, any> = {};
    if (input.name) payload.name = input.name;
    if (input.description) payload.description = input.description;
    if (input.rate !== undefined) payload.rate = input.rate;
    if (input.purchaseRate !== undefined) payload.purchase_rate = input.purchaseRate;
    if (input.sku) payload.sku = input.sku;
    if (input.unit) payload.unit = input.unit;
    if (input.taxId) payload.tax_id = input.taxId;

    let item: any;
    if (Object.keys(payload).length > 0) {
      let resp = await client.updateItem(input.itemId, payload);
      item = resp.item;
    } else {
      let resp = await client.getItem(input.itemId);
      item = resp.item;
    }

    return {
      output: {
        itemId: item.item_id,
        name: item.name,
        rate: item.rate,
        status: item.status
      },
      message: `Updated item **${item.name}**.`
    };
  })
  .build();
