import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createKpi = SlateTool.create(spec, {
  name: 'Create KPI',
  key: 'create_kpi',
  description: `Create a new KPI in SimpleKPI. Configure the KPI with a name, category, unit, frequency, target, value direction, and aggregation method.`,
  instructions: [
    'Use the "List KPI Configuration" tool to get valid unit IDs, frequency IDs, icon IDs, and category IDs before creating a KPI.'
  ]
})
  .input(
    z.object({
      name: z.string().describe('KPI name (max 100 characters)'),
      categoryId: z.number().describe('Category ID to assign the KPI to'),
      unitId: z.number().describe('Unit of measure ID'),
      frequencyId: z
        .string()
        .describe('Frequency code: D=Daily, W=Weekly, M=Monthly, Q=Quarterly, Y=Yearly'),
      iconId: z.number().describe('Icon ID for visual representation'),
      description: z.string().optional().describe('KPI description (max 150 characters)'),
      targetDefault: z
        .number()
        .optional()
        .nullable()
        .describe('Default target value. Null means no target.'),
      valueDirection: z.enum(['U', 'D', 'N']).describe('U=Up is good, D=Down is good, N=None'),
      aggregateFunction: z
        .enum(['SUM', 'AVG'])
        .describe('How values are aggregated: SUM or AVG'),
      sortOrder: z.number().describe('Display order'),
      isActive: z.boolean().default(true).describe('Whether the KPI is active for data entry')
    })
  )
  .output(
    z.object({
      kpiId: z.number().describe('ID of the newly created KPI'),
      name: z.string().describe('Name of the created KPI')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let result = await client.createKpi({
      name: ctx.input.name,
      category_id: ctx.input.categoryId,
      unit_id: ctx.input.unitId,
      frequency_id: ctx.input.frequencyId,
      icon_id: ctx.input.iconId,
      description: ctx.input.description,
      target_default: ctx.input.targetDefault ?? undefined,
      value_direction: ctx.input.valueDirection,
      aggregate_function: ctx.input.aggregateFunction,
      sort_order: ctx.input.sortOrder,
      is_active: ctx.input.isActive
    });

    return {
      output: {
        kpiId: result.id,
        name: result.name
      },
      message: `Created KPI **${result.name}** (ID: ${result.id}).`
    };
  })
  .build();
