import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getKpiEntry = SlateTool.create(spec, {
  name: 'Get KPI Entry',
  key: 'get_kpi_entry',
  description:
    'Retrieve a single raw KPI entry by ID, including actual, target, notes, user, and timestamps. Use List KPI Entries to discover entry IDs.',
  tags: { readOnly: true }
})
  .input(z.object({ entryId: z.number().describe('Entry ID from List KPI Entries') }))
  .output(
    z.object({
      entryId: z.number().describe('Entry identifier'),
      userId: z.number().describe('User identifier'),
      kpiId: z.number().describe('KPI identifier'),
      entryDate: z.string().describe('Date of the entry'),
      actual: z.number().nullable().describe('Actual value'),
      target: z.number().nullable().describe('Target value'),
      notes: z.string().nullable().describe('Entry notes'),
      createdAt: z.string().nullable().describe('Creation timestamp (UTC)'),
      updatedAt: z.string().nullable().describe('Last update timestamp (UTC)')
    })
  )
  .handleInvocation(async ctx => {
    let entry = await createClient(ctx.config, ctx.auth).getKpiEntry(ctx.input.entryId);
    return {
      output: {
        entryId: entry.id,
        userId: entry.user_id,
        kpiId: entry.kpi_id,
        entryDate: entry.entry_date,
        actual: entry.actual ?? null,
        target: entry.target ?? null,
        notes: entry.notes ?? null,
        createdAt: entry.created_at ?? null,
        updatedAt: entry.updated_at ?? null
      },
      message: `Retrieved KPI entry **${entry.id}** for KPI **${entry.kpi_id}**.`
    };
  })
  .build();
