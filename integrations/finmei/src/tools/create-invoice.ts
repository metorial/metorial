import { SlateTool } from 'slates';
import { z } from 'zod';
import { FinmeiClient } from '../lib/client';
import { spec } from '../spec';

let buyerSchema = z
  .object({
    name: z.string().optional().describe('Buyer/customer name'),
    email: z.string().optional().describe('Buyer email address'),
    phone: z.string().optional().describe('Buyer phone number'),
    address: z.string().optional().describe('Buyer street address'),
    city: z.string().optional().describe('Buyer city'),
    state: z.string().optional().describe('Buyer state or region'),
    country: z.string().optional().describe('Buyer country'),
    postalCode: z.string().optional().describe('Buyer postal/zip code'),
    taxId: z.string().optional().describe('Buyer tax identification number')
  })
  .describe('Buyer/customer details for the invoice');

let productItemSchema = z
  .object({
    name: z.string().describe('Product or service name'),
    quantity: z.number().describe('Quantity of the product'),
    price: z.number().describe('Unit price of the product'),
    units: z.string().optional().describe('Unit of measurement (e.g., "hours", "pieces")'),
    vatPercentage: z.number().optional().describe('VAT percentage for this item')
  })
  .describe('A line item on the invoice');

export let createInvoice = SlateTool.create(spec, {
  name: 'Create Invoice',
  key: 'create_invoice',
  description: `Create a new invoice in Finmei. Supports multiple invoice types including regular, VAT, preliminary, and credit invoices. You can specify buyer details, line items with products, currency, and optional notes.`,
  instructions: [
    'Provide at least one product item with name, quantity, and price.',
    'Use three-letter currency codes (e.g., "USD", "EUR"). Use the List Currencies tool to see supported currencies.',
    'Set **useDefaultSellerInfo** to true to use your saved business details as the seller.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      type: z
        .enum([
          'regular_invoice',
          'vat_invoice',
          'preliminary_invoice',
          'preliminary_vat_invoice',
          'credit_invoice',
          'credit_vat_invoice'
        ])
        .optional()
        .describe('Invoice type. Defaults to regular_invoice if not specified.'),
      invoiceDate: z.string().optional().describe('Invoice date in YYYY-MM-DD format'),
      series: z.string().optional().describe('Invoice series identifier'),
      currency: z
        .string()
        .optional()
        .describe('Three-letter currency code (e.g., "USD", "EUR")'),
      useDefaultSellerInfo: z
        .boolean()
        .optional()
        .describe('Use saved business details as the seller. Defaults to true.'),
      buyer: buyerSchema.optional(),
      products: z
        .array(productItemSchema)
        .describe('List of product/service line items on the invoice'),
      notes: z.string().optional().describe('Additional notes to include on the invoice')
    })
  )
  .output(
    z.object({
      invoiceId: z.string().describe('ID of the created invoice'),
      invoiceCode: z.string().optional().describe('Invoice code/number'),
      status: z.string().optional().describe('Invoice status'),
      currency: z.string().optional().describe('Currency code used'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      rawResponse: z.any().optional().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FinmeiClient(ctx.auth.token);

    let buyerData: Record<string, any> | undefined;
    if (ctx.input.buyer) {
      buyerData = {
        name: ctx.input.buyer.name,
        email: ctx.input.buyer.email,
        phone: ctx.input.buyer.phone,
        address: ctx.input.buyer.address,
        city: ctx.input.buyer.city,
        state: ctx.input.buyer.state,
        country: ctx.input.buyer.country,
        postal_code: ctx.input.buyer.postalCode,
        tax_id: ctx.input.buyer.taxId
      };
    }

    let productsData = ctx.input.products.map(p => ({
      name: p.name,
      quantity: p.quantity,
      price: p.price,
      units: p.units,
      vat_percentage: p.vatPercentage
    }));

    let result = await client.createInvoice({
      type: ctx.input.type,
      date: ctx.input.invoiceDate,
      series: ctx.input.series,
      currency: ctx.input.currency,
      use_default_seller_info: ctx.input.useDefaultSellerInfo ?? true,
      buyer: buyerData,
      products: productsData,
      notes: ctx.input.notes
    });

    let invoiceId = String(result?.id ?? result?.data?.id ?? '');
    let invoiceCode = result?.code ?? result?.data?.code;
    let status = result?.status ?? result?.data?.status;
    let currency = result?.currency ?? result?.data?.currency;
    let createdAt = result?.created_at ?? result?.data?.created_at;

    return {
      output: {
        invoiceId,
        invoiceCode,
        status,
        currency,
        createdAt,
        rawResponse: result
      },
      message: `Created invoice${invoiceCode ? ` **${invoiceCode}**` : ''} (ID: ${invoiceId}).`
    };
  })
  .build();
