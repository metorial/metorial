import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { voucherPayload } from '../lib/payloads';
import { mapVoucher } from '../lib/schemas';
import { fail, required } from '../lib/validation';
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

export let manageVoucher = SlateTool.create(spec, {
  name: 'Manage Voucher',
  key: 'manage_voucher',
  description: `Create, retrieve, or update bookkeeping vouchers in Lexoffice. Vouchers represent financial documents such as sales invoices, purchase invoices, credit notes, and their purchase counterparts.`,
  instructions: [
    'Use action "create" to add a new voucher — type, voucherNumber, voucherDate, totalGrossAmount, totalTaxAmount, taxType, and voucherItems are required.',
    'Use action "get" to retrieve full details of a voucher by its ID.',
    'Updates read the current version and preserve existing file IDs and omitted fields. A status change is supported only from unchecked to open; conflicts are not automatically retried.',
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
      useCollectiveContact: z
        .boolean()
        .optional()
        .describe('Explicitly use the collective customer or vendor instead of contactId'),
      expectedVersion: z
        .number()
        .optional()
        .describe('Expected current voucher version; refuse the update if it changed'),
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
    const client = new Client({ token: ctx.auth.token });
    const { action, voucherId, ...input } = ctx.input;
    if (action === 'create') {
      const result = await client.createVoucher(voucherPayload(input));
      return { output: result, message: `Created bookkeeping voucher **${result.id}**.` };
    }
    const id = required(voucherId, 'voucherId');
    const current = await client.getVoucher(id);
    if (action === 'get')
      return {
        output: mapVoucher(current),
        message: `Retrieved bookkeeping voucher **${current.id}**, status: ${current.voucherStatus ?? 'not supplied'}.`
      };
    if (
      !Object.entries(input).some(
        ([key, value]) => key !== 'expectedVersion' && value !== undefined
      )
    )
      fail('Provide at least one voucher field to update.');
    const result = await client.updateVoucher(id, voucherPayload(input, current));
    return {
      output: result,
      message: `Updated bookkeeping voucher **${result.id}**; existing file associations were preserved.`
    };
  })
  .build();
