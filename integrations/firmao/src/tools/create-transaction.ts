import { SlateTool } from 'slates';
import { z } from 'zod';
import { FirmaoClient } from '../lib/client';
import { spec } from '../spec';

let transactionEntrySchema = z.object({
  productId: z.number().optional().describe('Product ID to reference'),
  productCode: z.string().optional().describe('Product code'),
  productName: z.string().optional().describe('Product/service name'),
  quantity: z.number().describe('Quantity'),
  unit: z.string().optional().describe('Unit of measure (e.g., pcs, hrs)'),
  unitNetPrice: z.number().describe('Net price per unit'),
  vatPercent: z.number().optional().describe('VAT percentage'),
  discount: z.number().optional().describe('Discount percentage')
});

export let createTransaction = SlateTool.create(spec, {
  name: 'Create Transaction',
  key: 'create_transaction',
  description: `Create a financial transaction (invoice, pro forma, receipt, bill) in Firmao. Supports line items with products, pricing, VAT, and customer linkage. Both sales and purchase modes are available.`,
  instructions: [
    'Transaction number must be unique. Use the numbering series endpoint to get the next available number if needed.',
    'For correction invoices, use separate before/after entry pairs with baseEntryId linking to original positions.'
  ]
})
  .input(
    z.object({
      type: z
        .enum(['INVOICE', 'RECEIPT', 'PROFORMA', 'CORRECTION', 'BILL'])
        .describe('Transaction type'),
      mode: z.enum(['SALE', 'PURCHASE']).describe('Sale or purchase mode'),
      transactionNumber: z.string().describe('Unique transaction/invoice number'),
      transactionDate: z.string().optional().describe('Transaction date (YYYY-MM-DD)'),
      invoiceDate: z.string().optional().describe('Invoice issue date (YYYY-MM-DD)'),
      paymentDate: z.string().optional().describe('Payment due date (YYYY-MM-DD)'),
      customerId: z.number().optional().describe('Customer ID to associate'),
      customerName: z
        .string()
        .optional()
        .describe('Customer name (used with createCustomerIfNeeded)'),
      createCustomerIfNeeded: z
        .boolean()
        .optional()
        .describe('Auto-create customer if not found'),
      nipNumber: z.string().optional().describe('Customer NIP/tax number'),
      currency: z.string().optional().describe('Currency code (e.g., PLN, EUR, USD)'),
      paymentType: z.string().optional().describe('Payment method (CASH, TRANSFER, CARD)'),
      paid: z.boolean().optional().describe('Whether the transaction is paid'),
      paidValue: z.number().optional().describe('Amount already paid'),
      entries: z.array(transactionEntrySchema).describe('Line items for the transaction'),
      connectedDocNumber: z
        .string()
        .optional()
        .describe('Original document number (for corrections)'),
      connectedDocDate: z
        .string()
        .optional()
        .describe('Original document date (for corrections)'),
      correctionCause: z.string().optional().describe('Reason for correction'),
      customerStreet: z.string().optional().describe('Customer address street'),
      customerCity: z.string().optional().describe('Customer address city'),
      customerPostCode: z.string().optional().describe('Customer address post code'),
      customerCountry: z.string().optional().describe('Customer address country')
    })
  )
  .output(
    z.object({
      transactionId: z.number().describe('ID of the created transaction'),
      transactionNumber: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FirmaoClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let body: Record<string, any> = {
      type: ctx.input.type,
      mode: ctx.input.mode,
      transactionNumber: ctx.input.transactionNumber,
      transactionEntries: ctx.input.entries.map(e => ({
        product: e.productId,
        productCode: e.productCode,
        productName: e.productName,
        quantity: e.quantity,
        unit: e.unit,
        unitNettoPrice: e.unitNetPrice,
        vatPercent: e.vatPercent,
        discount: e.discount
      }))
    };

    if (ctx.input.transactionDate) body.transactionDate = ctx.input.transactionDate;
    if (ctx.input.invoiceDate) body.invoiceDate = ctx.input.invoiceDate;
    if (ctx.input.paymentDate) body.paymentDate = ctx.input.paymentDate;
    if (ctx.input.customerId !== undefined) body.customer = ctx.input.customerId;
    if (ctx.input.customerName) body.customerName = ctx.input.customerName;
    if (ctx.input.createCustomerIfNeeded !== undefined)
      body.createCustomerIfNeeded = ctx.input.createCustomerIfNeeded;
    if (ctx.input.nipNumber) body.nipNumber = ctx.input.nipNumber;
    if (ctx.input.currency) body.currency = ctx.input.currency;
    if (ctx.input.paymentType) body.paymentType = ctx.input.paymentType;
    if (ctx.input.paid !== undefined) body.paid = ctx.input.paid;
    if (ctx.input.paidValue !== undefined) body.paidValue = ctx.input.paidValue;
    if (ctx.input.connectedDocNumber) body.connectedDocNumber = ctx.input.connectedDocNumber;
    if (ctx.input.connectedDocDate) body.connectedDocDate = ctx.input.connectedDocDate;
    if (ctx.input.correctionCause) body.correctionCause = ctx.input.correctionCause;
    if (ctx.input.customerStreet) body['customerAddress.street'] = ctx.input.customerStreet;
    if (ctx.input.customerCity) body['customerAddress.city'] = ctx.input.customerCity;
    if (ctx.input.customerPostCode)
      body['customerAddress.postCode'] = ctx.input.customerPostCode;
    if (ctx.input.customerCountry) body['customerAddress.country'] = ctx.input.customerCountry;

    let result = await client.create('transactions', body);
    let createdId = result?.changelog?.[0]?.objectId ?? result?.id;

    return {
      output: {
        transactionId: createdId,
        transactionNumber: ctx.input.transactionNumber
      },
      message: `Created ${ctx.input.type.toLowerCase()} **${ctx.input.transactionNumber}** (ID: ${createdId}).`
    };
  })
  .build();
