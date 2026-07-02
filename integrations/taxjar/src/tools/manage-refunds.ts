import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let refundLineItemInput = z.object({
  lineItemId: z.string().optional().describe('Unique identifier for the line item'),
  quantity: z.number().optional().describe('Quantity refunded'),
  productIdentifier: z.string().optional().describe('Product identifier or SKU'),
  description: z.string().optional().describe('Item description'),
  productTaxCode: z.string().optional().describe('Product tax code'),
  unitPrice: z.number().optional().describe('Unit price (use negative for refunds)'),
  discount: z.number().optional().describe('Discount amount'),
  salesTax: z.number().optional().describe('Sales tax refunded (use negative for refunds)')
});

let refundLineItemOutput = z.object({
  lineItemId: z.string().optional(),
  quantity: z.number().optional(),
  productIdentifier: z.string().optional(),
  description: z.string().optional(),
  productTaxCode: z.string().optional(),
  unitPrice: z.number().optional(),
  discount: z.number().optional(),
  salesTax: z.number().optional()
});

let refundOutput = z.object({
  transactionId: z.string().describe('Unique refund transaction identifier'),
  userId: z.number().optional().describe('TaxJar user ID'),
  transactionDate: z.string().optional().describe('Date of the refund'),
  transactionReferenceId: z.string().optional().describe('Original order transaction ID'),
  provider: z.string().optional().describe('Marketplace provider'),
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
  amount: z.number().optional().describe('Total refund amount (negative)'),
  shipping: z.number().optional().describe('Shipping refund amount (negative)'),
  salesTax: z.number().optional().describe('Sales tax refunded (negative)'),
  lineItems: z.array(refundLineItemOutput).optional()
});

let mapRefundLineItems = (
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

let mapRefundOutput = (refund: any) => ({
  transactionId: refund.transaction_id,
  userId: refund.user_id,
  transactionDate: refund.transaction_date,
  transactionReferenceId: refund.transaction_reference_id,
  provider: refund.provider,
  fromCountry: refund.from_country,
  fromZip: refund.from_zip,
  fromState: refund.from_state,
  fromCity: refund.from_city,
  fromStreet: refund.from_street,
  toCountry: refund.to_country,
  toZip: refund.to_zip,
  toState: refund.to_state,
  toCity: refund.to_city,
  toStreet: refund.to_street,
  amount: refund.amount,
  shipping: refund.shipping,
  salesTax: refund.sales_tax,
  lineItems: mapRefundLineItems(refund.line_items)
});

// ---- List Refunds ----

export let listRefunds = SlateTool.create(spec, {
  name: 'List Refund Transactions',
  key: 'list_refunds',
  description: `List refund transaction IDs stored in TaxJar. Filter by date range or marketplace provider. Returns transaction IDs which can be used to fetch full refund details.`,
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
      fromTransactionDate: z.string().optional().describe('Start of date range'),
      toTransactionDate: z.string().optional().describe('End of date range'),
      provider: z.string().optional().describe('Marketplace provider filter')
    })
  )
  .output(
    z.object({
      refundIds: z.array(z.string()).describe('List of refund transaction IDs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment,
      apiVersion: ctx.config.apiVersion
    });

    let refunds = await client.listRefunds({
      transaction_date: ctx.input.transactionDate,
      from_transaction_date: ctx.input.fromTransactionDate,
      to_transaction_date: ctx.input.toTransactionDate,
      provider: ctx.input.provider
    });

    return {
      output: { refundIds: refunds },
      message: `Found **${refunds.length}** refund transaction(s).`
    };
  })
  .build();

// ---- Get Refund ----

export let getRefund = SlateTool.create(spec, {
  name: 'Get Refund Transaction',
  key: 'get_refund',
  description: `Retrieve a single refund transaction by its transaction ID. Returns full refund details including the referenced original order.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      transactionId: z.string().describe('Unique transaction ID of the refund'),
      provider: z.string().optional().describe('Marketplace provider if applicable')
    })
  )
  .output(refundOutput)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment,
      apiVersion: ctx.config.apiVersion
    });

    let refund = await client.showRefund(ctx.input.transactionId, ctx.input.provider);

    return {
      output: mapRefundOutput(refund),
      message: `Retrieved refund **${refund.transaction_id}** referencing order ${refund.transaction_reference_id ?? 'N/A'}: $${refund.amount ?? 0}.`
    };
  })
  .build();

// ---- Create Refund ----

export let createRefund = SlateTool.create(spec, {
  name: 'Create Refund Transaction',
  key: 'create_refund',
  description: `Create a new refund transaction in TaxJar linked to an original order. Monetary amounts should be negative. The refund transaction ID must be unique and different from the original order.`,
  instructions: [
    'The transactionId must be unique and different from the original order ID. Do not use periods in IDs.',
    'Use transactionReferenceId to link to the original order.',
    'Monetary amounts (amount, shipping, salesTax, unitPrice) should be negative for refunds.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      transactionId: z
        .string()
        .describe('Unique refund transaction ID (no periods, different from original order)'),
      transactionReferenceId: z
        .string()
        .describe('Transaction ID of the original order being refunded'),
      transactionDate: z.string().optional().describe('Refund date (YYYY/MM/DD)'),
      provider: z.string().optional().describe('Marketplace provider'),
      fromCountry: z.string().optional(),
      fromZip: z.string().optional(),
      fromState: z.string().optional(),
      fromCity: z.string().optional(),
      fromStreet: z.string().optional(),
      toCountry: z.string().describe('Destination country code'),
      toZip: z.string().describe('Destination ZIP code'),
      toState: z.string().describe('Destination state code'),
      toCity: z.string().optional(),
      toStreet: z.string().optional(),
      amount: z.number().describe('Total refund amount (negative)'),
      shipping: z.number().describe('Shipping refund amount (negative)'),
      salesTax: z.number().describe('Sales tax refunded (negative)'),
      customerId: z.string().optional(),
      exemptionType: z
        .enum(['wholesale', 'government', 'marketplace', 'other', 'non_exempt'])
        .optional(),
      lineItems: z.array(refundLineItemInput).optional()
    })
  )
  .output(refundOutput)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment,
      apiVersion: ctx.config.apiVersion
    });

    let refund = await client.createRefund({
      transaction_id: ctx.input.transactionId,
      transaction_reference_id: ctx.input.transactionReferenceId,
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
      output: mapRefundOutput(refund),
      message: `Created refund **${refund.transaction_id}** referencing order ${refund.transaction_reference_id ?? 'N/A'}: $${refund.amount ?? 0}.`
    };
  })
  .build();

// ---- Update Refund ----

export let updateRefund = SlateTool.create(spec, {
  name: 'Update Refund Transaction',
  key: 'update_refund',
  description: `Update an existing refund transaction in TaxJar. Only API-created refunds can be modified.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      transactionId: z.string().describe('Transaction ID of the refund to update'),
      transactionReferenceId: z.string().optional(),
      transactionDate: z.string().optional(),
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
      lineItems: z.array(refundLineItemInput).optional()
    })
  )
  .output(refundOutput)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment,
      apiVersion: ctx.config.apiVersion
    });

    let refund = await client.updateRefund({
      transaction_id: ctx.input.transactionId,
      transaction_reference_id: ctx.input.transactionReferenceId,
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
      output: mapRefundOutput(refund),
      message: `Updated refund **${refund.transaction_id}**.`
    };
  })
  .build();

// ---- Delete Refund ----

export let deleteRefund = SlateTool.create(spec, {
  name: 'Delete Refund Transaction',
  key: 'delete_refund',
  description: `Delete a refund transaction from TaxJar. Only API-created refunds can be deleted.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      transactionId: z.string().describe('Transaction ID of the refund to delete'),
      provider: z.string().optional().describe('Marketplace provider if applicable')
    })
  )
  .output(refundOutput)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment,
      apiVersion: ctx.config.apiVersion
    });

    let refund = await client.deleteRefund(ctx.input.transactionId, ctx.input.provider);

    return {
      output: mapRefundOutput(refund),
      message: `Deleted refund **${refund.transaction_id}**.`
    };
  })
  .build();
