import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createSickness = SlateTool.create(spec, {
  name: 'Create Sickness',
  key: 'create_sickness',
  description: `Record a new sickness entry for an employee in Breathe HR. Specify the start date, and optionally the end date, sickness type, and reason. Leaving the end date blank creates an open/ongoing sickness record.`
})
  .input(
    z.object({
      employeeId: z.string().describe('The ID of the employee'),
      startDate: z.string().describe('Sickness start date (format: YYYY/MM/DD)'),
      endDate: z
        .string()
        .optional()
        .describe('Sickness end date (format: YYYY/MM/DD). Leave blank for ongoing sickness.'),
      companySicknessTypeId: z.string().optional().describe('ID of the company sickness type'),
      reason: z.string().optional().describe('Reason for the sickness')
    })
  )
  .output(
    z.object({
      sickness: z.record(z.string(), z.any()).describe('The created sickness record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let result = await client.createSickness(ctx.input.employeeId, {
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      companySicknessTypeId: ctx.input.companySicknessTypeId,
      reason: ctx.input.reason
    });

    let sickness = result?.sicknesses?.[0] || result?.sickness || result;

    return {
      output: { sickness },
      message: `Created sickness record for employee **${ctx.input.employeeId}** starting ${ctx.input.startDate}.`
    };
  })
  .build();
