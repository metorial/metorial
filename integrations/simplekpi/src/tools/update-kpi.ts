import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let updateKpi = SlateTool.create(spec, {
  name: 'Update KPI',
  key: 'update_kpi',
  description: `Update an existing KPI's configuration. Only provide the fields you want to change; unspecified fields will remain unchanged. Calculated KPIs cannot be modified through the API.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      kpiId: z.number().describe('ID of the KPI to update'),
      name: z.string().optional().describe('New KPI name (max 100 characters)'),
      categoryId: z.number().optional().describe('New category ID'),
      unitId: z.number().optional().describe('New unit of measure ID'),
      frequencyId: z.string().optional().describe('New frequency code'),
      iconId: z.number().optional().describe('New icon ID'),
      description: z
        .string()
        .optional()
        .nullable()
        .describe('New description (max 150 characters)'),
      targetDefault: z.number().optional().nullable().describe('New default target value'),
      valueDirection: z.enum(['U', 'D', 'N']).optional().describe('New value direction'),
      aggregateFunction: z.enum(['SUM', 'AVG']).optional().describe('New aggregation method'),
      sortOrder: z.number().optional().describe('New display order'),
      isActive: z.boolean().optional().describe('Whether the KPI is active')
    })
  )
  .output(
    z.object({
      kpiId: z.number().describe('ID of the updated KPI'),
      name: z.string().describe('Name of the updated KPI')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let data: Record<string, unknown> = {};
    if (ctx.input.name !== undefined) data.name = ctx.input.name;
    if (ctx.input.categoryId !== undefined) data.category_id = ctx.input.categoryId;
    if (ctx.input.unitId !== undefined) data.unit_id = ctx.input.unitId;
    if (ctx.input.frequencyId !== undefined) data.frequency_id = ctx.input.frequencyId;
    if (ctx.input.iconId !== undefined) data.icon_id = ctx.input.iconId;
    if (ctx.input.description !== undefined) data.description = ctx.input.description;
    if (ctx.input.targetDefault !== undefined) data.target_default = ctx.input.targetDefault;
    if (ctx.input.valueDirection !== undefined)
      data.value_direction = ctx.input.valueDirection;
    if (ctx.input.aggregateFunction !== undefined)
      data.aggregate_function = ctx.input.aggregateFunction;
    if (ctx.input.sortOrder !== undefined) data.sort_order = ctx.input.sortOrder;
    if (ctx.input.isActive !== undefined) data.is_active = ctx.input.isActive;

    let result = await client.updateKpi(ctx.input.kpiId, data);

    return {
      output: {
        kpiId: result.id,
        name: result.name
      },
      message: `Updated KPI **${result.name}** (ID: ${result.id}).`
    };
  })
  .build();
