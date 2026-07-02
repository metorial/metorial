import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createKpiUnit = SlateTool.create(spec, {
  name: 'Create KPI Unit',
  key: 'create_kpi_unit',
  description: `Create a new KPI unit of measure. Units define how KPI values are displayed and entered (e.g., currency, percentage, count).`,
  instructions: [
    'entry_format is the format for data entry only, without prefix/suffix (e.g., "#.00").',
    'display_format is the full display format including prefix/suffix (e.g., "$ #.00" or "#.00%").'
  ]
})
  .input(
    z.object({
      name: z.string().describe('Unit name (max 25 characters)'),
      entryFormat: z.string().describe('Format for data entry (e.g., "#.00")'),
      displayFormat: z.string().describe('Full display format (e.g., "$ #.00" or "#.00%")'),
      isPercentage: z.boolean().describe('Whether this is a percentage unit')
    })
  )
  .output(
    z.object({
      unitId: z.number().describe('ID of the newly created unit'),
      name: z.string().describe('Name of the created unit')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let result = await client.createKpiUnit({
      name: ctx.input.name,
      entry_format: ctx.input.entryFormat,
      display_format: ctx.input.displayFormat,
      is_percentage: ctx.input.isPercentage
    });

    return {
      output: { unitId: result.id, name: result.name },
      message: `Created KPI unit **${result.name}** (ID: ${result.id}).`
    };
  })
  .build();

export let deleteKpiUnit = SlateTool.create(spec, {
  name: 'Delete KPI Unit',
  key: 'delete_kpi_unit',
  description: `Permanently delete a KPI unit of measure.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      unitId: z.number().describe('ID of the KPI unit to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    await client.deleteKpiUnit(ctx.input.unitId);

    return {
      output: { success: true },
      message: `Deleted KPI unit with ID **${ctx.input.unitId}**.`
    };
  })
  .build();
