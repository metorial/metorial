import { SlateTool } from 'slates';
import { z } from 'zod';
import { invokeGusto } from '../lib/actions';
import { companyIdSchema, paginationSchema } from '../lib/schemas';
import { spec } from '../spec';

const outputSchema = z.object({
  pagination: paginationSchema.optional(),
  paySchedules: z
    .array(
      z.object({
        payScheduleId: z.string().describe('UUID of the pay schedule'),
        frequency: z
          .string()
          .nullable()
          .optional()
          .describe('Pay frequency (weekly, biweekly, semi-monthly, monthly)'),
        anchorPayDate: z.string().nullable().optional().describe('Anchor pay date'),
        anchorEndOfPayPeriod: z
          .string()
          .nullable()
          .optional()
          .describe('Anchor end of pay period'),
        day1: z
          .number()
          .nullable()
          .optional()
          .describe('First day for semi-monthly schedules'),
        day2: z
          .number()
          .nullable()
          .optional()
          .describe('Second day for semi-monthly schedules'),
        name: z.string().nullable().optional().describe('Name of the pay schedule'),
        autoPilot: z.boolean().nullable().optional().describe('Whether auto-pilot is enabled')
      })
    )
    .describe('List of pay schedules')
});

export let listPaySchedules = SlateTool.create(spec, {
  name: 'List Pay Schedules',
  key: 'list_pay_schedules',
  description: `List pay schedules for a company. Pay schedules define the frequency and timing of payroll runs (weekly, biweekly, semi-monthly, monthly).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number, starting at 1.'),
      per: z.number().optional().describe('Results per page, 1 to 100.'),
      companyId: companyIdSchema
    })
  )
  .output(outputSchema)
  .handleInvocation(ctx =>
    invokeGusto('list_pay_schedules', ctx.input, ctx.auth, outputSchema)
  )
  .build();
