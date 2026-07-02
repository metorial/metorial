import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { getBaseUrl } from '../lib/helpers';
import { spec } from '../spec';

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
      companyId: z.string().describe('The UUID of the company')
    })
  )
  .output(
    z.object({
      paySchedules: z
        .array(
          z.object({
            payScheduleId: z.string().describe('UUID of the pay schedule'),
            frequency: z
              .string()
              .optional()
              .describe('Pay frequency (weekly, biweekly, semi-monthly, monthly)'),
            anchorPayDate: z.string().optional().describe('Anchor pay date'),
            anchorEndOfPayPeriod: z.string().optional().describe('Anchor end of pay period'),
            day1: z.number().optional().describe('First day for semi-monthly schedules'),
            day2: z.number().optional().describe('Second day for semi-monthly schedules'),
            name: z.string().optional().describe('Name of the pay schedule'),
            autoPilot: z.boolean().optional().describe('Whether auto-pilot is enabled')
          })
        )
        .describe('List of pay schedules')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: getBaseUrl(ctx.auth.environment)
    });

    let result = await client.listPaySchedules(ctx.input.companyId);
    let schedules = Array.isArray(result) ? result : result.pay_schedules || result;

    let mapped = schedules.map((s: any) => ({
      payScheduleId: s.uuid || s.id?.toString(),
      frequency: s.frequency,
      anchorPayDate: s.anchor_pay_date,
      anchorEndOfPayPeriod: s.anchor_end_of_pay_period,
      day1: s.day_1,
      day2: s.day_2,
      name: s.name,
      autoPilot: s.auto_pilot
    }));

    return {
      output: { paySchedules: mapped },
      message: `Found **${mapped.length}** pay schedule(s) for company ${ctx.input.companyId}.`
    };
  })
  .build();
