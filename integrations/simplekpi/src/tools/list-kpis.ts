import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let kpiSchema = z.object({
  kpiId: z.number().describe('KPI identifier'),
  categoryId: z.number().describe('Category the KPI belongs to'),
  iconId: z.number().describe('Icon identifier'),
  unitId: z.number().describe('Unit of measure identifier'),
  frequencyId: z
    .string()
    .describe('Tracking frequency code (D=Daily, W=Weekly, M=Monthly, etc.)'),
  name: z.string().describe('KPI name'),
  description: z.string().nullable().describe('KPI description'),
  targetDefault: z.number().nullable().describe('Default target value'),
  valueDirection: z.string().describe('Value direction: U=Up is good, D=Down is good, N=None'),
  aggregateFunction: z.string().describe('Aggregation method: SUM or AVG'),
  sortOrder: z.number().describe('Display order'),
  isActive: z.boolean().describe('Whether the KPI is active for data entry'),
  isCalculated: z.boolean().describe('Whether this is a calculated KPI'),
  createdAt: z.string().nullable().describe('Creation timestamp (UTC)'),
  updatedAt: z.string().nullable().describe('Last update timestamp (UTC)')
});

export let listKpis = SlateTool.create(spec, {
  name: 'List KPIs',
  key: 'list_kpis',
  description: `Retrieve all KPIs from your SimpleKPI account. Returns the full list of KPIs with their configuration including name, category, frequency, targets, and status.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      kpis: z.array(kpiSchema).describe('List of all KPIs')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let kpis = await client.listKpis();

    let mapped = kpis.map((k: any) => ({
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
    }));

    return {
      output: { kpis: mapped },
      message: `Retrieved **${mapped.length}** KPIs.`
    };
  })
  .build();
