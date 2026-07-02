import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let voucherItemInputSchema = z
  .object({
    amount: z.number().describe('Item amount'),
    taxAmount: z.number().describe('Tax amount for this item'),
    taxRatePercentage: z.number().describe('Tax rate percentage (e.g. 0, 7, 19)'),
    categoryId: z.string().describe('Posting category ID for this item')
  })
  .describe('Voucher line item');

let voucherItemOutputSchema = z.object({
  amount: z.number().optional().describe('Item amount'),
  taxAmount: z.number().optional().describe('Tax amount'),
  taxRatePercentage: z.number().optional().describe('Tax rate percentage'),
  categoryId: z.string().optional().describe('Posting category ID')
});

let voucherOutputSchema = z.object({
  id: z.string().optional().describe('Unique voucher ID'),
  resourceUri: z.string().optional().describe('Resource URI of the voucher'),
  type: z.string().optional().describe('Voucher type'),
  voucherNumber: z.string().optional().describe('Voucher number'),
  voucherDate: z.string().optional().describe('Voucher date'),
  dueDate: z.string().optional().describe('Due date'),
  totalGrossAmount: z.number().optional().describe('Total gross amount'),
  totalTaxAmount: z.number().optional().describe('Total tax amount'),
  taxType: z.string().optional().describe('Tax type: net, gross, or vatfree'),
  voucherStatus: z.string().optional().describe('Voucher status'),
  contactId: z.string().optional().describe('Associated contact ID'),
  voucherItems: z.array(voucherItemOutputSchema).optional().describe('Voucher line items'),
  version: z.number().optional().describe('Voucher version for optimistic locking'),
  createdDate: z.string().optional().describe('Creation date'),
  updatedDate: z.string().optional().describe('Last updated date')
});

let mapVoucher = (voucher: any) => ({
  id: voucher.id,
  resourceUri: voucher.resourceUri,
  type: voucher.type,
  voucherNumber: voucher.voucherNumber,
  voucherDate: voucher.voucherDate,
  dueDate: voucher.dueDate,
  totalGrossAmount: voucher.totalGrossAmount,
  totalTaxAmount: voucher.totalTaxAmount,
  taxType: voucher.taxType,
  voucherStatus: voucher.voucherStatus,
  contactId: voucher.contactId,
  voucherItems: voucher.voucherItems?.map((item: any) => ({
    amount: item.amount,
    taxAmount: item.taxAmount,
    taxRatePercentage: item.taxRatePercentage,
    categoryId: item.categoryId
  })),
  version: voucher.version,
  createdDate: voucher.createdDate,
  updatedDate: voucher.updatedDate
});

export let manageVoucher = SlateTool.create(spec, {
  name: 'Manage Voucher',
  key: 'manage_voucher',
  description: `Create, retrieve, or update bookkeeping vouchers in Lexoffice. Vouchers represent financial documents such as sales invoices, purchase invoices, credit notes, and their purchase counterparts.`,
  instructions: [
    'Use action "create" to add a new voucher — type, voucherNumber, voucherDate, totalGrossAmount, totalTaxAmount, taxType, and voucherItems are required.',
    'Use action "get" to retrieve full details of a voucher by its ID.',
    'Use action "update" to modify an existing voucher — voucherId is required.',
    'Supported voucher types: salesinvoice, salescreditnote, purchaseinvoice, purchasecreditnote.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'update'])
        .describe('Operation to perform on the voucher'),
      voucherId: z.string().optional().describe('Voucher ID (required for get and update)'),
      type: z
        .enum(['salesinvoice', 'salescreditnote', 'purchaseinvoice', 'purchasecreditnote'])
        .optional()
        .describe('Voucher type (required for create)'),
      voucherNumber: z.string().optional().describe('Voucher number (required for create)'),
      voucherDate: z
        .string()
        .optional()
        .describe('Voucher date in ISO format, e.g. 2024-01-15 (required for create)'),
      dueDate: z.string().optional().describe('Due date in ISO format'),
      totalGrossAmount: z
        .number()
        .optional()
        .describe('Total gross amount (required for create)'),
      totalTaxAmount: z.number().optional().describe('Total tax amount (required for create)'),
      taxType: z
        .enum(['net', 'gross', 'vatfree'])
        .optional()
        .describe('Tax type (required for create)'),
      voucherItems: z
        .array(voucherItemInputSchema)
        .optional()
        .describe('Voucher line items (required for create)'),
      contactId: z.string().optional().describe('Contact ID to associate with the voucher'),
      voucherStatus: z
        .enum(['open', 'paid', 'paidoff', 'voided', 'transferred', 'sepadebit', 'unchecked'])
        .optional()
        .describe('Voucher status')
    })
  )
  .output(voucherOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.type) throw new Error('type is required for voucher creation');
      if (!ctx.input.voucherNumber)
        throw new Error('voucherNumber is required for voucher creation');
      if (!ctx.input.voucherDate)
        throw new Error('voucherDate is required for voucher creation');
      if (ctx.input.totalGrossAmount === undefined)
        throw new Error('totalGrossAmount is required for voucher creation');
      if (ctx.input.totalTaxAmount === undefined)
        throw new Error('totalTaxAmount is required for voucher creation');
      if (!ctx.input.taxType) throw new Error('taxType is required for voucher creation');
      if (!ctx.input.voucherItems || ctx.input.voucherItems.length === 0)
        throw new Error('voucherItems are required for voucher creation');

      let voucherData: Record<string, any> = {
        type: ctx.input.type,
        voucherNumber: ctx.input.voucherNumber,
        voucherDate: ctx.input.voucherDate,
        totalGrossAmount: ctx.input.totalGrossAmount,
        totalTaxAmount: ctx.input.totalTaxAmount,
        taxType: ctx.input.taxType,
        voucherItems: ctx.input.voucherItems.map(item => ({
          amount: item.amount,
          taxAmount: item.taxAmount,
          taxRatePercentage: item.taxRatePercentage,
          categoryId: item.categoryId
        }))
      };
      if (ctx.input.dueDate) voucherData.dueDate = ctx.input.dueDate;
      if (ctx.input.contactId) voucherData.contactId = ctx.input.contactId;
      if (ctx.input.voucherStatus) voucherData.voucherStatus = ctx.input.voucherStatus;

      let result = await client.createVoucher(voucherData);

      return {
        output: {
          id: result.id,
          resourceUri: result.resourceUri,
          type: ctx.input.type,
          voucherNumber: ctx.input.voucherNumber,
          voucherDate: ctx.input.voucherDate,
          totalGrossAmount: ctx.input.totalGrossAmount,
          totalTaxAmount: ctx.input.totalTaxAmount,
          taxType: ctx.input.taxType,
          version: result.version,
          createdDate: result.createdDate,
          updatedDate: result.updatedDate
        },
        message: `Created ${ctx.input.type} voucher **${ctx.input.voucherNumber}** (${result.id}) for **${ctx.input.totalGrossAmount}** gross.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.voucherId) throw new Error('voucherId is required for get action');

      let voucher = await client.getVoucher(ctx.input.voucherId);
      let output = mapVoucher(voucher);

      return {
        output,
        message: `Retrieved voucher **${output.voucherNumber}** (${output.id}) — ${output.type}, status: **${output.voucherStatus}**, gross: **${output.totalGrossAmount}**.`
      };
    }

    // update
    if (!ctx.input.voucherId) throw new Error('voucherId is required for update action');

    let voucherData: Record<string, any> = {};
    if (ctx.input.type) voucherData.type = ctx.input.type;
    if (ctx.input.voucherNumber) voucherData.voucherNumber = ctx.input.voucherNumber;
    if (ctx.input.voucherDate) voucherData.voucherDate = ctx.input.voucherDate;
    if (ctx.input.dueDate) voucherData.dueDate = ctx.input.dueDate;
    if (ctx.input.totalGrossAmount !== undefined)
      voucherData.totalGrossAmount = ctx.input.totalGrossAmount;
    if (ctx.input.totalTaxAmount !== undefined)
      voucherData.totalTaxAmount = ctx.input.totalTaxAmount;
    if (ctx.input.taxType) voucherData.taxType = ctx.input.taxType;
    if (ctx.input.contactId) voucherData.contactId = ctx.input.contactId;
    if (ctx.input.voucherStatus) voucherData.voucherStatus = ctx.input.voucherStatus;
    if (ctx.input.voucherItems) {
      voucherData.voucherItems = ctx.input.voucherItems.map(item => ({
        amount: item.amount,
        taxAmount: item.taxAmount,
        taxRatePercentage: item.taxRatePercentage,
        categoryId: item.categoryId
      }));
    }

    let result = await client.updateVoucher(ctx.input.voucherId, voucherData);

    return {
      output: {
        id: result.id,
        resourceUri: result.resourceUri,
        version: result.version,
        createdDate: result.createdDate,
        updatedDate: result.updatedDate
      },
      message: `Updated voucher **${ctx.input.voucherNumber || result.id}**.`
    };
  })
  .build();
