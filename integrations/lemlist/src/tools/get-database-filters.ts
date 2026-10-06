import { SlateTool } from 'slates';
import { z } from 'zod';
import {
  Client,
  optionalBoolean,
  optionalNumber,
  optionalStrings,
  optionalText,
  row,
  text
} from '../lib/client';
import { spec } from '../spec';

export const getDatabaseFilters = SlateTool.create(spec, {
  key: 'get_database_filters',
  name: 'Get Database Filters',
  description:
    'Discover valid database filter IDs, meanings, input types, accepted values and numeric ranges before searching for people. Returns API-oriented filter definitions.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      mode: z
        .enum(['leads', 'companies'])
        .optional()
        .describe(
          'Scope definitions to people (leads) or companies; omit to discover both modes.'
        )
    })
  )
  .output(
    z.object({
      filters: z.array(
        z.object({
          filterId: z.string(),
          description: z.string(),
          type: z.string(),
          modes: z.array(z.string()).optional(),
          values: z.array(z.string()).optional(),
          range: z
            .object({
              min: z.number().optional(),
              max: z.number().optional(),
              default: z.string().optional(),
              percentage: z.boolean().optional()
            })
            .optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    const data = await new Client({ token: ctx.auth.token }).getDatabaseFilters(
      ctx.input.mode
    );
    const filters = data.map(item => {
      const range = item.range == null ? undefined : row(item.range);
      return {
        filterId: text(item.filterId, 'filter identifier'),
        description: text(item.description, 'filter description'),
        type: text(item.type, 'filter type'),
        modes: optionalStrings(item.mode),
        values: optionalStrings(item.values),
        range: range
          ? {
              min: optionalNumber(range.min),
              max: optionalNumber(range.max),
              default: optionalText(range.default),
              percentage: optionalBoolean(range.percentage)
            }
          : undefined
      };
    });
    return {
      output: { filters },
      message: `Retrieved **${filters.length}** database filter definitions.`
    };
  })
  .build();
