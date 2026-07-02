import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClientFromContext } from '../lib/helpers';
import { spec } from '../spec';

let journalLineSchema = z.object({
  lineAmount: z
    .number()
    .describe('Amount for this journal line (positive for debit, negative for credit)'),
  accountCode: z.string().describe('Account code'),
  description: z.string().optional().describe('Line description'),
  taxType: z.string().optional().describe('Tax type code'),
  tracking: z
    .array(
      z.object({
        name: z.string().describe('Tracking category name'),
        option: z.string().describe('Tracking option name')
      })
    )
    .optional()
    .describe('Tracking categories for this line')
});

let journalOutputSchema = z.object({
  manualJournalId: z.string().optional().describe('Unique manual journal ID'),
  date: z.string().optional().describe('Journal date'),
  status: z.string().optional().describe('Status: DRAFT, POSTED, VOIDED'),
  narration: z.string().optional().describe('Journal narration/description'),
  lineAmountTypes: z.string().optional().describe('How amounts are calculated'),
  url: z.string().optional().describe('URL link'),
  showOnCashBasisReports: z
    .boolean()
    .optional()
    .describe('Whether to show on cash basis reports'),
  updatedDate: z.string().optional().describe('Last updated timestamp')
});

let mapJournal = (j: any) => ({
  manualJournalId: j.ManualJournalID,
  date: j.Date,
  status: j.Status,
  narration: j.Narration,
  lineAmountTypes: j.LineAmountTypes,
  url: j.Url,
  showOnCashBasisReports: j.ShowOnCashBasisReports,
  updatedDate: j.UpdatedDateUTC
});

export let createManualJournal = SlateTool.create(spec, {
  name: 'Create Manual Journal',
  key: 'create_manual_journal',
  description: `Creates a manual journal entry in Xero. Journal lines must balance (total debits must equal total credits). Use positive amounts for debits and negative amounts for credits.`,
  instructions: [
    'Journal lines must balance — the sum of all lineAmounts must be zero',
    'Use positive values for debits and negative values for credits'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      narration: z.string().describe('Description/narration for the journal entry'),
      journalLines: z
        .array(journalLineSchema)
        .min(2)
        .describe('Journal lines (must balance to zero)'),
      date: z.string().optional().describe('Journal date (YYYY-MM-DD). Defaults to today'),
      status: z
        .enum(['DRAFT', 'POSTED'])
        .optional()
        .describe('Initial status. Defaults to DRAFT'),
      lineAmountTypes: z
        .enum(['Exclusive', 'Inclusive', 'NoTax'])
        .optional()
        .describe('How amounts are calculated'),
      url: z.string().optional().describe('URL reference for the journal'),
      showOnCashBasisReports: z.boolean().optional().describe('Show on cash basis reports')
    })
  )
  .output(journalOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);

    let journal = await client.createManualJournal({
      Narration: ctx.input.narration,
      JournalLines: ctx.input.journalLines.map(jl => ({
        LineAmount: jl.lineAmount,
        AccountCode: jl.accountCode,
        Description: jl.description,
        TaxType: jl.taxType,
        Tracking: jl.tracking?.map(t => ({ Name: t.name, Option: t.option }))
      })),
      Date: ctx.input.date,
      Status: ctx.input.status || 'DRAFT',
      LineAmountTypes: ctx.input.lineAmountTypes,
      Url: ctx.input.url,
      ShowOnCashBasisReports: ctx.input.showOnCashBasisReports
    });

    let output = mapJournal(journal);

    return {
      output,
      message: `Created manual journal **${output.manualJournalId}** — "${output.narration}" with status **${output.status}**.`
    };
  })
  .build();

export let listManualJournals = SlateTool.create(spec, {
  name: 'List Manual Journals',
  key: 'list_manual_journals',
  description: `Lists manual journal entries from Xero with optional filtering by status, date, or modification time.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (starting from 1)'),
      modifiedAfter: z
        .string()
        .optional()
        .describe('Only return journals modified after this date (ISO 8601)'),
      where: z.string().optional().describe('Xero API where filter, e.g. `Status=="POSTED"`'),
      order: z.string().optional().describe('Order results, e.g. "Date DESC"')
    })
  )
  .output(
    z.object({
      manualJournals: z.array(journalOutputSchema).describe('List of manual journals'),
      count: z.number().describe('Number of journals returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);

    let result = await client.getManualJournals({
      page: ctx.input.page,
      modifiedAfter: ctx.input.modifiedAfter,
      where: ctx.input.where,
      order: ctx.input.order
    });

    let manualJournals = (result.ManualJournals || []).map(mapJournal);

    return {
      output: { manualJournals, count: manualJournals.length },
      message: `Found **${manualJournals.length}** manual journal(s).`
    };
  })
  .build();
