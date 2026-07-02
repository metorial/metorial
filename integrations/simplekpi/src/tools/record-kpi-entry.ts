import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let recordKpiEntry = SlateTool.create(spec, {
  name: 'Record KPI Entry',
  key: 'record_kpi_entry',
  description: `Record an actual value, target, and/or notes for a KPI on a given date. Supports setting or incrementing the actual value, and selectively updating actuals, targets, or notes. You can identify the user by ID or email address.`,
  instructions: [
    'The KPI must be active, non-calculated, and assigned to the user.',
    'Set addToActual to true to increment the existing value instead of replacing it.',
    'Use setActual/setTarget/setNotes flags to control which fields are updated.'
  ]
})
  .input(
    z.object({
      kpiId: z.number().describe('ID of the KPI to record data for'),
      entryDate: z.string().describe('Date of the entry in YYYY-MM-DD format'),
      userId: z.number().optional().describe('User ID to record the entry for'),
      userEmail: z.string().optional().describe('User email (alternative to userId)'),
      actual: z.number().optional().nullable().describe('Actual value to record'),
      target: z.number().optional().nullable().describe('Target value to record'),
      notes: z
        .string()
        .optional()
        .nullable()
        .describe('Notes for this entry (max 500 characters)'),
      setActual: z.boolean().optional().describe('If false, preserves existing actual value'),
      setTarget: z.boolean().optional().describe('If false, preserves existing target value'),
      setNotes: z.boolean().optional().describe('If false, preserves existing notes'),
      addToActual: z
        .boolean()
        .optional()
        .describe('If true, adds to existing actual instead of replacing')
    })
  )
  .output(
    z.object({
      entryId: z.number().describe('ID of the created/updated entry'),
      userId: z.number().describe('User ID the entry belongs to'),
      kpiId: z.number().describe('KPI ID the entry is for'),
      entryDate: z.string().describe('Date of the entry'),
      actual: z.number().nullable().describe('Actual value'),
      target: z.number().nullable().describe('Target value'),
      notes: z.string().nullable().describe('Entry notes')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let data: Record<string, unknown> = {
      kpi_id: ctx.input.kpiId,
      entry_date: ctx.input.entryDate
    };

    if (ctx.input.userId !== undefined) data.user_id = ctx.input.userId;
    if (ctx.input.userEmail !== undefined) data.email = ctx.input.userEmail;
    if (ctx.input.actual !== undefined) data.actual = ctx.input.actual;
    if (ctx.input.target !== undefined) data.target = ctx.input.target;
    if (ctx.input.notes !== undefined) data.notes = ctx.input.notes;
    if (ctx.input.setActual !== undefined) data.setActual = ctx.input.setActual;
    if (ctx.input.setTarget !== undefined) data.setTarget = ctx.input.setTarget;
    if (ctx.input.setNotes !== undefined) data.setNotes = ctx.input.setNotes;
    if (ctx.input.addToActual !== undefined) data.addToActual = ctx.input.addToActual;

    let result = await client.createKpiEntry(data as any);

    return {
      output: {
        entryId: result.id,
        userId: result.user_id,
        kpiId: result.kpi_id,
        entryDate: result.entry_date,
        actual: result.actual ?? null,
        target: result.target ?? null,
        notes: result.notes ?? null
      },
      message: `Recorded entry for KPI **${ctx.input.kpiId}** on ${ctx.input.entryDate} (Entry ID: ${result.id}).`
    };
  })
  .build();
