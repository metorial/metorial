import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      holidayAllowances: z
        .array(z.record(z.string(), z.any()))
        .describe('List of holiday allowance records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let result = await client.listHolidayAllowances({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let holidayAllowances = result?.holiday_allowances || [];

    return {
      output: { holidayAllowances },
      message: `Retrieved **${holidayAllowances.length}** holiday allowance(s).`
    };
  })
  .build();
