import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { pageParams, paginationSchema, readRows } from '../lib/response';
import { spec } from '../spec';

export let listHolidayAllowances = SlateTool.create(spec, {
  name: 'List Holiday Allowances',
  key: 'list_holiday_allowances',
  description: `Retrieve holiday allowance configurations from Breathe HR. Returns allowances with name, units, amount, and other attributes used to track employee leave entitlements.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      pagination: paginationSchema.optional(),
      holidayAllowances: z
        .array(z.record(z.string(), z.unknown()))
        .describe('List of holiday allowance records')
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client({ token: ctx.auth.token, environment: ctx.config.environment });

    const result = await client.list(
      'holiday_allowances',
      { ...pageParams(ctx.input, false) },
      false
    );
    const holidayAllowances = readRows(result, 'holiday_allowances');
    return {
      output: { holidayAllowances, pagination: result.pagination },
      message: `Retrieved **${holidayAllowances.length}** holiday allowance(s).`
    };
  })
  .build();
