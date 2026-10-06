import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { pageOutput } from '../lib/schemas';
import { spec } from '../spec';

let voucherListItemSchema = z.object({
  id: z.string().optional().describe('Voucher ID'),
  voucherType: z.string().optional().describe('Type of the voucher'),
  voucherStatus: z.string().optional().describe('Current voucher status'),
  voucherNumber: z.string().optional().describe('Voucher number'),
  voucherDate: z.string().optional().describe('Voucher date'),
  dueDate: z.string().optional().describe('Due date'),
  contactId: z.string().optional().describe('Associated contact ID'),
  contactName: z.string().optional().describe('Associated contact name'),
  totalAmount: z.number().optional().describe('Total amount'),
  openAmount: z.number().optional().describe('Open amount remaining'),
  currency: z.string().optional().describe('Currency code'),
  createdDate: z.string().optional().describe('Creation date'),
  updatedDate: z.string().optional().describe('Last updated date')
});

export let listVouchers = SlateTool.create(spec, {
  name: 'List Vouchers',
  key: 'list_vouchers',
  description: `Lists bookkeeping vouchers from the Lexoffice voucherlist endpoint. Returns all voucher types including invoices, credit notes, and purchase documents. Supports filtering by type, status, date ranges, contact, and voucher number.`,
  instructions: [
    'Use voucherType to filter by specific types like "salesinvoice", "purchaseinvoice", etc.',
    'Date filters use ISO format (YYYY-MM-DD).',
    'Use sort to order results, e.g. "voucherDate,DESC" or "voucherNumber,ASC".',
    'Page numbering starts at 0.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      voucherType: z
        .string()
        .optional()
        .describe(
          'Required filter; use any for all types, or comma-separated types (e.g. salesinvoice, purchaseinvoice, salescreditnote, purchasecreditnote)'
        ),
      voucherStatus: z
        .string()
        .optional()
        .describe(
          'Required filter; use any for all statuses, or comma-separated statuses (e.g. open, paid, paidoff, voided, transferred, sepadebit)'
        ),
      voucherDateFrom: z
        .string()
        .optional()
        .describe('Filter vouchers with date on or after this ISO date'),
      voucherDateTo: z
        .string()
        .optional()
        .describe('Filter vouchers with date on or before this ISO date'),
      createdDateFrom: z
        .string()
        .optional()
        .describe('Filter vouchers created on or after this ISO date'),
      createdDateTo: z
        .string()
        .optional()
        .describe('Filter vouchers created on or before this ISO date'),
      updatedDateFrom: z
        .string()
        .optional()
        .describe('Filter vouchers updated on or after this ISO date'),
      updatedDateTo: z
        .string()
        .optional()
        .describe('Filter vouchers updated on or before this ISO date'),
      contactId: z.string().optional().describe('Filter by associated contact ID'),
      voucherNumber: z.string().optional().describe('Filter by voucher number'),
      page: z.number().optional().describe('Page number (starting from 0)'),
      size: z.number().optional().describe('Number of results per page (default 25, max 250)'),
      sort: z.string().optional().describe('Sort order, e.g. "voucherDate,DESC"')
    })
  )
  .output(
    z.object({
      vouchers: z.array(voucherListItemSchema).describe('List of vouchers'),
      currentPage: z.number().optional().describe('Actual zero-based page index'),
      first: z.boolean().optional().describe('Whether this is the first page'),
      last: z
        .boolean()
        .optional()
        .describe('Whether this is the last page in the search window'),
      nextPage: z.number().optional().describe('Next page index, when available'),
      searchWindowLimit: z.number().optional().describe('Maximum searchable results'),
      windowMayBeTruncated: z
        .boolean()
        .optional()
        .describe('Whether narrower filters may be needed beyond the search window'),
      count: z.number().describe('Number of vouchers returned on this page'),
      totalPages: z.number().optional().describe('Total number of pages available'),
      totalElements: z
        .number()
        .optional()
        .describe('Total number of vouchers matching the filter')
    })
  )
  .handleInvocation(async ctx => {
    const result = await new Client({ token: ctx.auth.token }).listVouchers(ctx.input);
    return {
      output: {
        vouchers: result.content,
        count: result.content.length,
        ...pageOutput(result)
      },
      message: `Retrieved ${result.content.length} voucher(s) on page ${result.number}.`
    };
  })
  .build();
