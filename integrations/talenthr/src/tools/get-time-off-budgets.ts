import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const getTimeOffBudgets = SlateTool.create(spec, {
  key: 'get_time_off_budgets',
  name: 'Get Time Off Budgets',
  description:
    'Get fixed and accrual time-off budgets for a TalentHR employee. Budget amounts remain provider decimal strings. Results may include historical cycles; optionally select the active cycle or a specific cycle.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      employeeId: z.string().describe('Employee ID from list_employees'),
      active: z
        .boolean()
        .optional()
        .describe('When true, restrict results to the active time-off cycle'),
      timeOffCycleId: z
        .number()
        .optional()
        .describe('Restrict results to a known positive time-off cycle ID')
    })
  )
  .output(
    z.object({
      budgets: z
        .array(
          z
            .object({
              id: z.number(),
              employee_id: z.number(),
              timeoff_type_id: z.number(),
              timeoff_type_name: z.string(),
              budget: z.string(),
              original_budget: z.string(),
              used_budget: z.string()
            })
            .passthrough()
        )
        .describe('Time-off budgets with accrual and cycle fields preserved'),
      count: z.number().describe('Number of budget records returned'),
      rawResponse: z.any().optional().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    const response = await new Client({ token: ctx.auth.token }).getTimeOffBudgets(
      ctx.input.employeeId,
      {
        active: ctx.input.active === true ? 1 : undefined,
        time_off_cycle_id: ctx.input.timeOffCycleId
      }
    );
    return {
      output: { budgets: response.data, count: response.data.length, rawResponse: response },
      message: `Retrieved ${response.data.length} time-off budget record(s).`
    };
  })
  .build();
