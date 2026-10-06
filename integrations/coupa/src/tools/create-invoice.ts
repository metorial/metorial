import { SlateTool } from 'slates';
import { z } from 'zod';
import { CoupaClient } from '../lib/client';
import { customFields, decimal, requireValue } from '../lib/contracts';
import { spec } from '../spec';

let invoiceLineSchema = z
  .object({
    description: z.string().describe('Line item description'),
    quantity: z.number().optional().describe('Quantity'),
    quantityDecimal: z
      .string()
      .optional()
      .describe('Exact plain decimal quantity; omit the numeric alias for high precision'),
    price: z.number().optional().describe('Unit price'),
    priceDecimal: z
      .string()
      .optional()
      .describe('Exact plain decimal price; omit the numeric alias for high precision'),
    lineNumber: z.number().optional().describe('Line number'),
    purchaseOrderLineId: z.number().optional().describe('PO line ID for PO-backed invoices'),
    account: z.any().optional().describe('Account object for this line'),
    commodity: z.object({ name: z.string() }).optional().describe('Commodity'),
    taxLines: z
      .array(z.record(z.string(), z.unknown()))
      .optional()
      .describe('Documented native tax-lines objects'),
    taxCode: z.object({ code: z.string() }).optional().describe('Native tax-code reference'),
    tax: z.any().optional().describe('Tax details')
  })
  .describe('Invoice line item');

export let createInvoice = SlateTool.create(spec, {
  name: 'Create Invoice',
  key: 'create_invoice',
  description: `Create a new invoice in Coupa. Supports both PO-backed invoices (linked to purchase order lines) and non-PO invoices. Include invoice lines with descriptions, quantities, and prices.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      invoiceNumber: z.string().describe('Unique invoice number'),
      invoiceDate: z.string().describe('Invoice date (ISO 8601)'),
      supplier: z
        .object({
          supplierId: z.number().optional().describe('Supplier ID'),
          supplierNumber: z.string().optional().describe('Supplier number')
        })
        .describe('Supplier reference'),
      currency: z
        .object({
          code: z.string()
        })
        .optional()
        .describe('Invoice currency'),
      paymentTermCode: z.string().optional().describe('Payment term code'),
      shipToAddress: z
        .object({
          addressId: z.number()
        })
        .optional()
        .describe('Ship-to address reference'),
      invoiceLines: z
        .array(invoiceLineSchema)
        .min(1)
        .describe('Invoice line items (at least one required)'),
      isCredit: z.boolean().optional().describe('Set to true to create a credit note'),
      customFieldsGlobalNamespace: z
        .boolean()
        .optional()
        .describe(
          'Use true for existing global custom fields (legacy default); false places fields under the modern custom-fields namespace'
        ),
      customFields: z.record(z.string(), z.any()).optional().describe('Custom field values')
    })
  )
  .output(
    z.object({
      invoiceId: z.number().describe('Created invoice ID'),
      invoiceNumber: z.string().nullable().optional().describe('Invoice number'),
      status: z.string().nullable().optional().describe('Invoice status after creation'),
      rawData: z
        .any()
        .optional()
        .describe('Native data with documented credential fields omitted')
    })
  )
  .handleInvocation(async ctx => {
    let client = CoupaClient.from(ctx);

    requireValue(
      Boolean(ctx.input.supplier.supplierId) !== Boolean(ctx.input.supplier.supplierNumber),
      'Provide exactly one supplier ID or supplier number.'
    );
    requireValue(
      ctx.input.invoiceLines.every(line => line.tax === undefined),
      'Legacy tax is not a documented writable invoice-line field. Omit tax and supply documented taxLines or taxCode; no invoice was created.'
    );
    let supplierRef: any = {};
    if (ctx.input.supplier.supplierId) supplierRef.id = ctx.input.supplier.supplierId;
    else if (ctx.input.supplier.supplierNumber)
      supplierRef.number = ctx.input.supplier.supplierNumber;

    let payload: any = {
      'invoice-number': ctx.input.invoiceNumber,
      'invoice-date': ctx.input.invoiceDate,
      supplier: supplierRef,
      'invoice-lines': ctx.input.invoiceLines.map((line, idx) => {
        let il: any = {
          description: line.description,
          quantity: decimal(line.quantity, line.quantityDecimal, 'quantity'),
          price: decimal(line.price, line.priceDecimal, 'price', 46, 20),
          'line-num': line.lineNumber ?? idx + 1
        };
        if (line.purchaseOrderLineId) {
          il['order-line-id'] = line.purchaseOrderLineId;
        }
        if (line.account) il.account = line.account;
        if (line.commodity) il.commodity = line.commodity;
        if (line.taxLines) il['tax-lines'] = line.taxLines;
        if (line.taxCode) il['tax-code'] = line.taxCode;
        return il;
      })
    };

    if (ctx.input.currency) payload.currency = ctx.input.currency;
    if (ctx.input.paymentTermCode)
      payload['payment-term'] = { code: ctx.input.paymentTermCode };
    if (ctx.input.shipToAddress)
      payload['ship-to-address'] = { id: ctx.input.shipToAddress.addressId };
    if (ctx.input.isCredit !== undefined) payload['is-credit-note'] = ctx.input.isCredit;
    customFields(
      payload,
      ctx.input.customFields,
      ctx.input.customFieldsGlobalNamespace ?? true
    );

    let result = await client.createInvoice(payload);

    return {
      output: {
        invoiceId: result.id,
        invoiceNumber: result['invoice-number'] ?? result.invoice_number ?? null,
        status: result.status ?? null,
        rawData: result
      },
      message: `Created invoice **#${result['invoice-number'] ?? result.invoice_number ?? result.id}** (status: ${result.status}).`
    };
  })
  .build();
