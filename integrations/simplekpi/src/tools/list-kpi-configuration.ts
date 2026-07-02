import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let unitSchema = z.object({
  unitId: z.number().describe('Unit identifier'),
  name: z.string().describe('Unit name'),
  entryFormat: z.string().describe('Format for data entry (e.g., #.00)'),
  displayFormat: z.string().describe('Full display format (e.g., $ #.00 or #.00%)'),
  isPercentage: z.boolean().describe('Whether this is a percentage unit'),
  createdAt: z.string().nullable().describe('Creation timestamp (UTC)'),
  updatedAt: z.string().nullable().describe('Last update timestamp (UTC)')
});

let frequencySchema = z.object({
  frequencyId: z.string().describe('Frequency code (e.g., D, W, M)'),
  name: z.string().describe('Frequency name (e.g., Daily, Weekly)')
});

let iconSchema = z.object({
  iconId: z.number().describe('Icon identifier'),
  name: z.string().describe('Icon name (SVG)')
});

export let listKpiConfiguration = SlateTool.create(spec, {
  name: 'List KPI Configuration',
  key: 'list_kpi_configuration',
  description: `Retrieve KPI configuration reference data: available units, frequencies, and icons. Use this to get valid IDs when creating or updating KPIs.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      units: z.array(unitSchema).describe('Available KPI units'),
      frequencies: z.array(frequencySchema).describe('Available tracking frequencies'),
      icons: z.array(iconSchema).describe('Available KPI icons')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let [units, frequencies, icons] = await Promise.all([
      client.listKpiUnits(),
      client.listKpiFrequencies(),
      client.listKpiIcons()
    ]);

    let mappedUnits = (Array.isArray(units) ? units : []).map((u: any) => ({
      unitId: u.id,
      name: u.name,
      entryFormat: u.entry_format,
      displayFormat: u.display_format,
      isPercentage: u.is_percentage,
      createdAt: u.created_at ?? null,
      updatedAt: u.updated_at ?? null
    }));

    let mappedFrequencies = (Array.isArray(frequencies) ? frequencies : []).map((f: any) => ({
      frequencyId: f.id,
      name: f.name
    }));

    let mappedIcons = (Array.isArray(icons) ? icons : []).map((i: any) => ({
      iconId: i.id,
      name: i.name
    }));

    return {
      output: {
        units: mappedUnits,
        frequencies: mappedFrequencies,
        icons: mappedIcons
      },
      message: `Retrieved **${mappedUnits.length}** units, **${mappedFrequencies.length}** frequencies, and **${mappedIcons.length}** icons.`
    };
  })
  .build();
