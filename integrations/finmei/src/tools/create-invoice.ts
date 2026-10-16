import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import {
  FinmeiClient,
  optionalString,
  optionalTimestamp,
  readEntity,
  requireId
} from '../lib/client';
import { spec } from '../spec';

let buyerSchema = z
  .object({
    name: z
      .string()
      .optional()
      .describe('Buyer/customer name; company-name fallback for a company buyer'),
    type: z.enum(['company', 'individual']).optional().describe('Required buyer type'),
    companyName: z.string().optional().describe('Company name, required for a company buyer'),
    companyCode: z.string().optional().describe('Company registration code'),
    firstName: z.string().optional().describe('Given name, required for an individual buyer'),
    lastName: z.string().optional().describe('Family name, required for an individual buyer'),
    vatCode: z.string().optional().describe('VAT registration code'),
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

export let invoiceInput = z.object({
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
    .describe('Invoice type, required when creating an invoice.'),
  invoiceDate: z.string().optional().describe('Invoice date in YYYY-MM-DD format'),
  series: z.string().optional().describe('Invoice series identifier'),
  currency: z.string().optional().describe('Three-letter currency code (e.g., "USD", "EUR")'),
  useDefaultSellerInfo: z
    .boolean()
    .optional()
    .describe('Use saved business details as the seller. Defaults to true.'),
  buyer: buyerSchema.optional(),
  seller: z
    .object({
      companyName: z.string().optional(),
      companyCode: z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      individualTaxId: z.string().optional(),
      vatCode: z.string().optional(),
      address: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      customFields: z.array(z.object({ label: z.string(), value: z.string() })).optional()
    })
    .optional()
    .describe('Seller details when useDefaultSellerInfo is false'),
  paymentOptions: z
    .array(
      z.object({
        type: z.enum(['bank', 'other']),
        bankAccount: z.string().optional(),
        bankName: z.string().optional(),
        routingOrSortNumber: z.string().optional(),
        swiftBicCode: z.string().optional(),
        fields: z.array(z.object({ label: z.string(), value: z.string() })).optional()
      })
    )
    .optional()
    .describe('Bank and other payment instructions shown on the invoice'),
  dueDate: z.string().optional().describe('Payment due date in YYYY-MM-DD format'),
  invoiceNumber: z
    .string()
    .optional()
    .describe('Explicit invoice number; omit for automatic numbering'),
  paymentStatus: z.enum(['paid', 'not_paid']).optional().describe('Invoice payment state'),
  language: z.enum(['en', 'es', 'lt']).optional().describe('Invoice language'),
  products: z
    .array(productItemSchema)
    .describe('List of product/service line items on the invoice'),
  notes: z.string().optional().describe('Additional notes to include on the invoice')
});

export let buildInvoiceData = (input: z.infer<typeof invoiceInput>) => {
  if (!input.type || !input.invoiceDate || !input.series?.trim() || !input.currency?.trim()) {
    throw createApiServiceError(
      'Provide type, invoiceDate, series, and currency to create an invoice.'
    );
  }
  if (!input.buyer?.type)
    throw createApiServiceError('Provide buyer.type and the buyer details.');
  let buyer = input.buyer;
  if (buyer.type === 'company' && !(buyer.companyName ?? buyer.name)?.trim())
    throw createApiServiceError('Provide buyer.companyName for a company buyer.');
  if (buyer.type === 'individual' && (!buyer.firstName?.trim() || !buyer.lastName?.trim()))
    throw createApiServiceError(
      'Provide buyer.firstName and buyer.lastName for an individual buyer.'
    );
  if (
    !input.products.length ||
    input.products.some(product => !product.name.trim() || !product.units?.trim())
  )
    throw createApiServiceError(
      'Provide at least one product with name, units, quantity, and price.'
    );
  if (input.useDefaultSellerInfo === false && !input.seller)
    throw createApiServiceError('Provide seller details when useDefaultSellerInfo is false.');
  if (input.seller && input.useDefaultSellerInfo !== false)
    throw createApiServiceError(
      'Set useDefaultSellerInfo to false when providing seller details.'
    );
  let buyerData = pickDefined({
    type: buyer.type,
    company_name: buyer.companyName ?? (buyer.type === 'company' ? buyer.name : undefined),
    company_code: buyer.companyCode,
    first_name: buyer.firstName,
    last_name: buyer.lastName,
    individual_tax_id: buyer.type === 'individual' ? buyer.taxId : undefined,
    vat_code: buyer.vatCode,
    email: buyer.email,
    phone: buyer.phone,
    address: buyer.address,
    city: buyer.city,
    state: buyer.state,
    country: buyer.country,
    postal_code: buyer.postalCode
  });
  let seller = input.seller;
  let sellerData = seller
    ? pickDefined({
        company_name: seller.companyName,
        company_code: seller.companyCode,
        first_name: seller.firstName,
        last_name: seller.lastName,
        individual_tax_id: seller.individualTaxId,
        vat_code: seller.vatCode,
        address: seller.address,
        email: seller.email,
        phone: seller.phone,
        custom_fields: seller.customFields
      })
    : undefined;

  let productsData = input.products.map(p => ({
    name: p.name,
    quantity: p.quantity,
    price: p.price,
    units: p.units,
    vat_percentage: p.vatPercentage
  }));

  return {
    type: input.type,
    invoice_date: input.invoiceDate,
    pay_until_date: input.dueDate,
    invoice_number: input.invoiceNumber,
    payment_status: input.paymentStatus,
    language: input.language,
    payment_options: input.paymentOptions?.map(option =>
      pickDefined({
        type: option.type,
        bank_account: option.bankAccount,
        bank_name: option.bankName,
        routing_or_sort_number: option.routingOrSortNumber,
        swift_bic_code: option.swiftBicCode,
        fields: option.fields
      })
    ),
    seller: sellerData,
    series: input.series,
    currency: input.currency,
    use_default_seller_info: input.useDefaultSellerInfo ?? true,
    buyer: buyerData,
    products: productsData,
    notes: input.notes
  };
};

export let createInvoice = SlateTool.create(spec, {
  name: 'Create Invoice',
  key: 'create_invoice',
  description: `Create a new invoice in Finmei. Supports multiple invoice types including regular, VAT, preliminary, and credit invoices. You can specify buyer details, line items with products, currency, and optional notes.`,
  instructions: [
    'Provide type, invoiceDate, series, currency, buyer.type and buyer details, and at least one product item with name, units, quantity, and price.',
    'Use three-letter currency codes (e.g., "USD", "EUR"). Use the List Currencies tool to see supported currencies.',
    'Set **useDefaultSellerInfo** to true to use your saved business details as the seller.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(invoiceInput)
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

    let result = await client.createInvoice(buildInvoiceData(ctx.input));

    let invoice = readEntity(result, 'invoice');
    let invoiceId = requireId(invoice.id, 'invoice ID');
    let invoiceCode =
      invoice.invoice_number === undefined || invoice.invoice_number === null
        ? optionalString(invoice.code, 'invoice code')
        : requireId(invoice.invoice_number, 'invoice number');
    let status = optionalString(invoice.payment_status ?? invoice.status, 'invoice status');
    let currency = optionalString(invoice.currency, 'invoice currency');
    let createdAt = optionalTimestamp(invoice.created_at, 'invoice creation time');

    return {
      output: {
        invoiceId,
        ...pickDefined({
          invoiceCode,
          status,
          currency,
          createdAt,
          rawResponse: result
        })
      },
      message: `Created invoice${invoiceCode ? ` **${invoiceCode}**` : ''} (ID: ${invoiceId}).`
    };
  })
  .build();
