import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let recordKpiEntriesBatch = SlateTool.create(spec, {
  name: 'Record KPI Entries (Batch)',
  key: 'record_kpi_entries_batch',
  description: `Record multiple KPI data entries at once. Supports up to 5,000 entries per batch. Use flags to control whether actuals, targets, or notes are updated across all entries in the batch.`,
  constraints: ['Maximum 5,000 entries per batch request.']
})
  .input(
    z.object({
      entries: z
        .array(
          z.object({
            kpiId: z.number().describe('KPI ID'),
            entryDate: z.string().describe('Date in YYYY-MM-DD format'),
            userId: z.number().optional().describe('User ID'),
            userEmail: z.string().optional().describe('User email (alternative to userId)'),
            actual: z.number().optional().nullable().describe('Actual value'),
            target: z.number().optional().nullable().describe('Target value'),
            notes: z.string().optional().nullable().describe('Notes (max 500 characters)')
          })
        )
        .describe('Array of KPI entry records to create'),
      hasActuals: z.boolean().optional().describe('If false, preserves all existing actuals'),
      hasTargets: z.boolean().optional().describe('If false, preserves all existing targets'),
      hasNotes: z.boolean().optional().describe('If false, preserves all existing notes')
    })
  )
  .output(
    z.object({
      rowsAdded: z.number().describe('Number of entries created or updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let entries = ctx.input.entries.map(e => {
      let entry: Record<string, unknown> = {
        kpi_id: e.kpiId,
        entry_date: e.entryDate
      };
      if (e.userId !== undefined) entry.user_id = e.userId;
      if (e.userEmail !== undefined) entry.email = e.userEmail;
      if (e.actual !== undefined) entry.actual = e.actual;
      if (e.target !== undefined) entry.target = e.target;
      if (e.notes !== undefined) entry.notes = e.notes;
      return entry;
    });

    let result = await client.createKpiEntriesBatch({
      entries: entries as any,
      hasActuals: ctx.input.hasActuals,
      hasTargets: ctx.input.hasTargets,
      hasNotes: ctx.input.hasNotes
    });

    return {
      output: { rowsAdded: result.rows_added },
      message: `Batch recorded **${result.rows_added}** KPI entries.`
    };
  })
  .build();
