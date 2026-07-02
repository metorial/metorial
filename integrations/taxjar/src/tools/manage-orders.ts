import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let orderLineItemInput = z.object({
  lineItemId: z.string().optional().describe('Unique identifier for the line item'),
  quantity: z.number().optional().describe('Quantity purchased'),
  productIdentifier: z.string().optional().describe('Product identifier or SKU'),
  description: z.string().optional().describe('Item description'),
  productTaxCode: z.string().optional().describe('Product tax code'),
  unitPrice: z.number().optional().describe('Unit price'),
  discount: z.number().optional().describe('Total discount for the line item'),
  salesTax: z.number().optional().describe('Sales tax collected for the line item')
});

let orderLineItemOutput = z.object({
  lineItemId: z.string().optional(),
  quantity: z.number().optional(),
  productIdentifier: z.string().optional(),
  description: z.string().optional(),
  productTaxCode: z.string().optional(),
  unitPrice: z.number().optional(),
  discount: z.number().optional(),
  salesTax: z.number().optional()
});

let orderOutput = z.object({
  transactionId: z.string().describe('Unique transaction identifier'),
  userId: z.number().optional().describe('TaxJar user ID'),
  transactionDate: z.string().optional().describe('Date of the transaction'),
  provider: z.string().optional().describe('Marketplace provider source'),
  fromCountry: z.string().optional(),
  fromZip: z.string().optional(),
  fromState: z.string().optional(),
  fromCity: z.string().optional(),
  fromStreet: z.string().optional(),
  toCountry: z.string().optional(),
  toZip: z.string().optional(),
  toState: z.string().optional(),
  toCity: z.string().optional(),
  toStreet: z.string().optional(),
  amount: z.number().optional().describe('Total order amount excluding tax'),
  shipping: z.number().optional().describe('Shipping cost'),
  salesTax: z.number().optional().describe('Sales tax collected'),
  lineItems: z.array(orderLineItemOutput).optional().describe('Order line items')
});

let mapOrderLineItems = (
  items?: Array<{
    id?: string;
    quantity?: number;
    product_identifier?: string;
    description?: string;
    product_tax_code?: string;
    unit_price?: number;
    discount?: number;
    sales_tax?: number;
  }>
) => {
  return items?.map(li => ({
    lineItemId: li.id,
    quantity: li.quantity,
    productIdentifier: li.product_identifier,
    description: li.description,
    productTaxCode: li.product_tax_code,
    unitPrice: li.unit_price,
    discount: li.discount,
    salesTax: li.sales_tax
  }));
};

let mapOrderOutput = (order: any) => ({
  transactionId: order.transaction_id,
  userId: order.user_id,
  transactionDate: order.transaction_date,
  provider: order.provider,
  fromCountry: order.from_country,
  fromZip: order.from_zip,
  fromState: order.from_state,
  fromCity: order.from_city,
  fromStreet: order.from_street,
  toCountry: order.to_country,
  toZip: order.to_zip,
  toState: order.to_state,
  toCity: order.to_city,
  toStreet: order.to_street,
  amount: order.amount,
  shipping: order.shipping,
  salesTax: order.sales_tax,
  lineItems: mapOrderLineItems(order.line_items)
});

// ---- List Orders ----

export let listOrders = SlateTool.create(spec, {
  name: 'List Order Transactions',
  key: 'list_orders',
  description: `List order transaction IDs stored in TaxJar for sales tax reporting. Filter by date range or marketplace provider. Returns transaction IDs which can be used to fetch full order details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      transactionDate: z
        .string()
        .optional()
        .describe('Exact date to filter by (YYYY-MM-DD or MM/DD/YYYY)'),
      fromTransactionDate: z
        .string()
        .optional()
        .describe('Start of date range (YYYY-MM-DD or MM/DD/YYYY)'),
      toTransactionDate: z
        .string()
        .optional()
        .describe('End of date range (YYYY-MM-DD or MM/DD/YYYY)'),
      provider: z
        .string()
        .optional()
        .describe('Marketplace provider filter (e.g. amazon, ebay)')
    })
  )
  .output(
    z.object({
      orderIds: z.array(z.string()).describe('List of order transaction IDs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment,
      apiVersion: ctx.config.apiVersion
    });

    let orders = await client.listOrders({
      transaction_date: ctx.input.transactionDate,
      from_transaction_date: ctx.input.fromTransactionDate,
      to_transaction_date: ctx.input.toTransactionDate,
      provider: ctx.input.provider
    });

    return {
      output: { orderIds: orders },
      message: `Found **${orders.length}** order transaction(s).`
    };
  })
  .build();

// ---- Get Order ----

export let getOrder = SlateTool.create(spec, {
  name: 'Get Order Transaction',
  key: 'get_order',
  description: `Retrieve a single order transaction by its transaction ID. Returns full order details including addresses, amounts, and line items.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      transactionId: z.string().describe('Unique transaction ID of the order'),
      provider: z.string().optional().describe('Marketplace provider if applicable')
    })
  )
  .output(orderOutput)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment,
      apiVersion: ctx.config.apiVersion
    });

    let order = await client.showOrder(ctx.input.transactionId, ctx.input.provider);

    return {
      output: mapOrderOutput(order),
      message: `Retrieved order **${order.transaction_id}**: $${order.amount ?? 0} with $${order.sales_tax ?? 0} sales tax.`
    };
  })
  .build();

// ---- Create Order ----

export let createOrder = SlateTool.create(spec, {
  name: 'Create Order Transaction',
  key: 'create_order',
  description: `Create a new order transaction in TaxJar for sales tax reporting and filing. The order will appear on the Transactions page in TaxJar.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      transactionId: z
        .string()
        .describe('Unique transaction ID for the order (no periods allowed)'),
      transactionDate: z.string().optional().describe('Transaction date (YYYY/MM/DD)'),
      provider: z
        .string()
        .optional()
        .describe('Marketplace provider (e.g. amazon, ebay, facebook)'),
      fromCountry: z.string().optional().describe('Origin two-letter ISO country code'),
      fromZip: z.string().optional().describe('Origin ZIP code'),
      fromState: z.string().optional().describe('Origin state code'),
      fromCity: z.string().optional().describe('Origin city'),
      fromStreet: z.string().optional().describe('Origin street address'),
      toCountry: z.string().describe('Destination country code'),
      toZip: z.string().describe('Destination ZIP code'),
      toState: z.string().describe('Destination state code'),
      toCity: z.string().optional().describe('Destination city'),
      toStreet: z.string().optional().describe('Destination street address'),
      amount: z.number().describe('Total order amount excluding tax'),
      shipping: z.number().describe('Total shipping cost'),
      salesTax: z.number().describe('Total sales tax collected'),
      customerId: z.string().optional().describe('Customer ID for exemption tracking'),
      exemptionType: z
        .enum(['wholesale', 'government', 'marketplace', 'other', 'non_exempt'])
        .optional(),
      lineItems: z.array(orderLineItemInput).optional().describe('Order line items')
    })
  )
  .output(orderOutput)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment,
      apiVersion: ctx.config.apiVersion
    });

    let order = await client.createOrder({
      transaction_id: ctx.input.transactionId,
      transaction_date: ctx.input.transactionDate,
      provider: ctx.input.provider,
      from_country: ctx.input.fromCountry,
      from_zip: ctx.input.fromZip,
      from_state: ctx.input.fromState,
      from_city: ctx.input.fromCity,
      from_street: ctx.input.fromStreet,
      to_country: ctx.input.toCountry,
      to_zip: ctx.input.toZip,
      to_state: ctx.input.toState,
      to_city: ctx.input.toCity,
      to_street: ctx.input.toStreet,
      amount: ctx.input.amount,
      shipping: ctx.input.shipping,
      sales_tax: ctx.input.salesTax,
      customer_id: ctx.input.customerId,
      exemption_type: ctx.input.exemptionType,
      line_items: ctx.input.lineItems?.map(li => ({
        id: li.lineItemId,
        quantity: li.quantity,
        product_identifier: li.productIdentifier,
        description: li.description,
        product_tax_code: li.productTaxCode,
        unit_price: li.unitPrice,
        discount: li.discount,
        sales_tax: li.salesTax
      }))
    });

    return {
      output: mapOrderOutput(order),
      message: `Created order **${order.transaction_id}**: $${order.amount ?? 0} with $${order.sales_tax ?? 0} sales tax.`
    };
  })
  .build();

// ---- Update Order ----

export let updateOrder = SlateTool.create(spec, {
  name: 'Update Order Transaction',
  key: 'update_order',
  description: `Update an existing order transaction in TaxJar. Only API-created transactions can be modified. Provide only the fields you want to update.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      transactionId: z.string().describe('Transaction ID of the order to update'),
      transactionDate: z.string().optional().describe('Updated transaction date'),
      fromCountry: z.string().optional(),
      fromZip: z.string().optional(),
      fromState: z.string().optional(),
      fromCity: z.string().optional(),
      fromStreet: z.string().optional(),
      toCountry: z.string().optional(),
      toZip: z.string().optional(),
      toState: z.string().optional(),
      toCity: z.string().optional(),
      toStreet: z.string().optional(),
      amount: z.number().optional(),
      shipping: z.number().optional(),
      salesTax: z.number().optional(),
      customerId: z.string().optional(),
      exemptionType: z
        .enum(['wholesale', 'government', 'marketplace', 'other', 'non_exempt'])
        .optional(),
      lineItems: z.array(orderLineItemInput).optional()
    })
  )
  .output(orderOutput)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment,
      apiVersion: ctx.config.apiVersion
    });

    let order = await client.updateOrder({
      transaction_id: ctx.input.transactionId,
      transaction_date: ctx.input.transactionDate,
      from_country: ctx.input.fromCountry,
      from_zip: ctx.input.fromZip,
      from_state: ctx.input.fromState,
      from_city: ctx.input.fromCity,
      from_street: ctx.input.fromStreet,
      to_country: ctx.input.toCountry,
      to_zip: ctx.input.toZip,
      to_state: ctx.input.toState,
      to_city: ctx.input.toCity,
      to_street: ctx.input.toStreet,
      amount: ctx.input.amount,
      shipping: ctx.input.shipping,
      sales_tax: ctx.input.salesTax,
      customer_id: ctx.input.customerId,
      exemption_type: ctx.input.exemptionType,
      line_items: ctx.input.lineItems?.map(li => ({
        id: li.lineItemId,
        quantity: li.quantity,
        product_identifier: li.productIdentifier,
        description: li.description,
        product_tax_code: li.productTaxCode,
        unit_price: li.unitPrice,
        discount: li.discount,
        sales_tax: li.salesTax
      }))
    });

    return {
      output: mapOrderOutput(order),
      message: `Updated order **${order.transaction_id}**.`
    };
  })
  .build();

// ---- Delete Order ----

export let deleteOrder = SlateTool.create(spec, {
  name: 'Delete Order Transaction',
  key: 'delete_order',
  description: `Delete an order transaction from TaxJar. Only API-created transactions can be deleted.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      transactionId: z.string().describe('Transaction ID of the order to delete'),
      provider: z.string().optional().describe('Marketplace provider if applicable')
    })
  )
  .output(orderOutput)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment,
      apiVersion: ctx.config.apiVersion
    });

    let order = await client.deleteOrder(ctx.input.transactionId, ctx.input.provider);

    return {
      output: mapOrderOutput(order),
      message: `Deleted order **${order.transaction_id}**.`
    };
  })
  .build();
