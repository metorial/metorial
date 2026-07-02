import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getKpi = SlateTool.create(spec, {
  name: 'Get KPI',
  key: 'get_kpi',
  description: `Retrieve a single KPI by its ID. Returns the full KPI configuration including name, description, category, frequency, target, and aggregation settings.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      kpiId: z.number().describe('ID of the KPI to retrieve')
    })
  )
  .output(
    z.object({
      kpiId: z.number().describe('KPI identifier'),
      categoryId: z.number().describe('Category the KPI belongs to'),
      iconId: z.number().describe('Icon identifier'),
      unitId: z.number().describe('Unit of measure identifier'),
      frequencyId: z.string().describe('Tracking frequency code'),
      name: z.string().describe('KPI name'),
      description: z.string().nullable().describe('KPI description'),
      targetDefault: z.number().nullable().describe('Default target value'),
      valueDirection: z.string().describe('Value direction: U, D, or N'),
      aggregateFunction: z.string().describe('Aggregation method: SUM or AVG'),
      sortOrder: z.number().describe('Display order'),
      isActive: z.boolean().describe('Whether the KPI is active'),
      isCalculated: z.boolean().describe('Whether this is a calculated KPI'),
      createdAt: z.string().nullable().describe('Creation timestamp (UTC)'),
      updatedAt: z.string().nullable().describe('Last update timestamp (UTC)')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let k = await client.getKpi(ctx.input.kpiId);

    return {
      output: {
        kpiId: k.id,
        categoryId: k.category_id,
        iconId: k.icon_id,
        unitId: k.unit_id,
        frequencyId: k.frequency_id,
        name: k.name,
        description: k.description ?? null,
        targetDefault: k.target_default ?? null,
        valueDirection: k.value_direction,
        aggregateFunction: k.aggregate_function,
        sortOrder: k.sort_order,
        isActive: k.is_active,
        isCalculated: k.is_calculated,
        createdAt: k.created_at ?? null,
        updatedAt: k.updated_at ?? null
      },
      message: `Retrieved KPI **${k.name}** (ID: ${k.id}).`
    };
  })
  .build();
