import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { dateRange, readOne, requireDate, requireId } from '../lib/response';
import { spec } from '../spec';

export let createSickness = SlateTool.create(spec, {
  name: 'Create Sickness',
  key: 'create_sickness',
  description: `Record a new sickness entry for an employee in Breathe HR. Specify the start date, and optionally the end date, sickness type, and reason. Leaving the end date blank creates an open/ongoing sickness record.`
})
  .input(
    z.object({
      employeeId: z.string().describe('The ID of the employee'),
      startDate: z.string().describe('Sickness start date (format: YYYY-MM-DD or YYYY/MM/DD)'),
      endDate: z
        .string()
        .optional()
        .describe(
          'Sickness end date (format: YYYY-MM-DD or YYYY/MM/DD). Leave blank for ongoing sickness.'
        ),
      companySicknessTypeId: z
        .string()
        .optional()
        .describe(
          'Required company sickness type ID, supplied by an authorized account administrator'
        ),
      reason: z.string().optional().describe('Reason for the sickness')
    })
  )
  .output(
    z.object({
      sickness: z.record(z.string(), z.unknown()).describe('The created sickness record')
    })
  )
  .handleInvocation(async ctx => {
    const employeeId = requireId(ctx.input.employeeId, 'employeeId');
    const startDate = requireDate(ctx.input.startDate, 'startDate');
    const endDate =
      ctx.input.endDate === undefined ? undefined : requireDate(ctx.input.endDate, 'endDate');
    dateRange(startDate, endDate);
    const sickness = readOne(
      await new Client({
        token: ctx.auth.token,
        environment: ctx.config.environment
      }).employeeCreate('sicknesses', employeeId, 'sickness', {
        start_date: startDate,
        end_date: endDate,
        company_sicknesstype_id: requireId(
          ctx.input.companySicknessTypeId,
          'companySicknessTypeId from the account configuration'
        ),
        reason: ctx.input.reason
      }),
      'sicknesses'
    );
    return {
      output: { sickness },
      message: 'Created the sickness record. Medical/personnel history may be retained.'
    };
  })
  .build();
