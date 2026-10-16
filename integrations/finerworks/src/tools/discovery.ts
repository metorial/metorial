import { SlateTool } from 'slates';
import { z } from 'zod';
import {
  Client,
  requiredArray,
  requiredNumber,
  requiredString,
  requireInteger
} from '../lib/client';
import { spec } from '../spec';

let rawSchema = z.record(z.string(), z.unknown());

export let whoAmI = SlateTool.create(spec, {
  key: 'who_am_i',
  name: 'Get Connected Account',
  description:
    'Identify the FinerWorks account linked to the current API credentials and inspect account setup status.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      accountId: z.number(),
      username: z.string().optional(),
      email: z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      profileComplete: z.boolean().optional(),
      invoicePaymentEnabled: z.boolean().optional(),
      accountCredits: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let data = await new Client(ctx.auth).testCredentials();
    let account = data.user_account;
    return {
      output: {
        accountId: requiredNumber(account?.account_id, 'user_account.account_id'),
        username: account.account_username ?? undefined,
        email: account.account_email ?? undefined,
        firstName: account.account_firstname ?? undefined,
        lastName: account.account_lastname ?? undefined,
        profileComplete: account.user_profile_complete ?? undefined,
        invoicePaymentEnabled: account.enable_invoice_payment ?? undefined,
        accountCredits: account.user_account_credits ?? undefined
      },
      message: `Connected FinerWorks account ${account.account_id}.`
    };
  })
  .build();

export let listOrders = SlateTool.create(spec, {
  key: 'list_orders',
  name: 'List Orders',
  description:
    'Find submitted FinerWorks orders by purchase order reference, ID, date, status or text. Discover order IDs for tracking and updates, and order GUIDs and emails for get_order. Check this list before retrying an uncertain submission.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      searchFilter: z.string().optional(),
      status: z.string().optional(),
      orderIds: z.array(z.number()).optional(),
      orderPos: z.array(z.string()).optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      pageNumber: z.number().min(1).default(1),
      perPage: z.number().min(1).max(25).default(25),
      showCancelled: z.boolean().optional()
    })
  )
  .output(
    z.object({
      orders: z.array(
        z.object({
          orderId: z.number(),
          orderPo: z.string().optional(),
          orderGuid: z.string().optional(),
          orderEmail: z.string().optional(),
          recipient: z.string().optional(),
          orderDate: z.string().optional(),
          status: z.string().optional(),
          total: z.number().optional(),
          tracking: rawSchema.optional()
        })
      ),
      totalCount: z.number(),
      totalAmount: z.number().optional(),
      raw: rawSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    requireInteger(ctx.input.pageNumber, 'Page number');
    requireInteger(ctx.input.perPage, 'Orders per page', 1, 25);
    ctx.input.orderIds?.forEach(id => requireInteger(id, 'Order ID'));
    let data = await new Client(ctx.auth).listOrders({
      search_filter: ctx.input.searchFilter,
      status: ctx.input.status,
      order_ids: ctx.input.orderIds,
      order_pos: ctx.input.orderPos,
      date_from: ctx.input.dateFrom,
      date_to: ctx.input.dateTo,
      page_number: ctx.input.pageNumber,
      per_page: ctx.input.perPage,
      show_cancelled: ctx.input.showCancelled
    });
    let orders = requiredArray(data.orders, 'orders').map(order => ({
      orderId: requiredNumber(order.order_id, 'orders[].order_id'),
      orderPo: order.order_po ?? undefined,
      orderGuid: order.order_guid ?? undefined,
      orderEmail: order.order_email ?? undefined,
      recipient: order.recipient ?? undefined,
      orderDate: order.order_date ?? undefined,
      status: order.status ?? undefined,
      total: order.total ?? undefined,
      tracking: order.tracking ?? undefined
    }));
    return {
      output: {
        orders,
        totalCount: requiredNumber(data.total_count, 'total_count'),
        totalAmount: data.total_amount ?? undefined,
        raw: data
      },
      message: `Found ${orders.length} order(s) on page ${ctx.input.pageNumber}.`
    };
  })
  .build();

export let getOrder = SlateTool.create(spec, {
  key: 'get_order',
  name: 'Get Order Details',
  description:
    'Retrieve a complete order receipt, including recipient, purchased items and totals. Call list_orders to discover the order GUID and order email.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      orderGuid: z.string().min(1).describe('Order GUID from list_orders or submit_orders'),
      orderEmail: z
        .string()
        .min(1)
        .describe('Order email from list_orders or the original order')
    })
  )
  .output(z.object({ order: rawSchema, raw: rawSchema.optional() }))
  .handleInvocation(async ctx => {
    let data = await new Client(ctx.auth).getOrder(ctx.input.orderGuid, ctx.input.orderEmail);
    return { output: { order: data.order, raw: data }, message: 'Retrieved order details.' };
  })
  .build();

export let listVirtualInventory = SlateTool.create(spec, {
  key: 'list_virtual_inventory',
  name: 'List Virtual Inventory',
  description:
    'Discover reusable product SKUs in the connected FinerWorks virtual inventory for pricing, shipping quotes and fulfillment. Supports text, SKU, product code and image filters with pagination.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      searchFilter: z.string().optional(),
      skuFilter: z.array(z.string()).max(50).optional(),
      productCodeFilter: z.array(z.string()).max(50).optional(),
      productTypeIds: z.array(z.number()).optional(),
      imageGuids: z.array(z.string()).optional(),
      createdDateFrom: z.string().optional(),
      createdDateTo: z.string().optional(),
      pageNumber: z.number().min(1).default(1),
      perPage: z.number().min(1).max(50).default(25),
      sortField: z
        .enum(['id', 'title', 'file_name', 'file_size', 'updated', 'date_added'])
        .default('id'),
      sortDirection: z.enum(['ASC', 'DESC']).default('DESC')
    })
  )
  .output(
    z.object({
      products: z.array(
        z.object({
          sku: z.string(),
          productId: z.number().optional(),
          productCode: z.string().optional(),
          name: z.string().optional(),
          imageGuid: z.string().optional(),
          productGuid: z.string().optional(),
          perItemPrice: z.number().optional(),
          askingPrice: z.number().optional(),
          quantityInStock: z.number().optional(),
          trackInventory: z.boolean().optional(),
          raw: rawSchema.optional()
        })
      ),
      pageNumber: z.number(),
      perPage: z.number(),
      totalCount: z.number(),
      raw: rawSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    requireInteger(ctx.input.pageNumber, 'Page number');
    requireInteger(ctx.input.perPage, 'Products per page', 1, 50);
    ctx.input.productTypeIds?.forEach(id => requireInteger(id, 'Product type ID'));
    let data = await new Client(ctx.auth).listVirtualInventory({
      search_filter: ctx.input.searchFilter,
      sku_filter: ctx.input.skuFilter,
      product_code_filter: ctx.input.productCodeFilter,
      product_type_ids_filter: ctx.input.productTypeIds,
      guid_filter: ctx.input.imageGuids,
      created_date_from: ctx.input.createdDateFrom,
      created_date_to: ctx.input.createdDateTo,
      page_number: ctx.input.pageNumber,
      per_page: ctx.input.perPage,
      sort_field: ctx.input.sortField,
      sort_direction: ctx.input.sortDirection
    });
    let products = requiredArray(data.products, 'products').map(product => ({
      sku: requiredString(product.sku, 'products[].sku'),
      productId: product.id ?? undefined,
      productCode: product.product_code ?? undefined,
      name: product.name ?? undefined,
      imageGuid: product.image_guid ?? undefined,
      productGuid: product.product_guid ?? undefined,
      perItemPrice: product.per_item_price ?? undefined,
      askingPrice: product.asking_price ?? undefined,
      quantityInStock: product.quantity_in_stock ?? undefined,
      trackInventory: product.track_inventory ?? undefined,
      raw: product
    }));
    return {
      output: {
        products,
        pageNumber: requiredNumber(data.page_number, 'page_number'),
        perPage: requiredNumber(data.per_page, 'per_page'),
        totalCount: requiredNumber(data.count, 'count'),
        raw: data
      },
      message: `Found ${products.length} product(s) on page ${ctx.input.pageNumber}.`
    };
  })
  .build();
