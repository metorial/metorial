import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { fail, readOne, readRows, requireId } from '../lib/response';
import { spec } from '../spec';

export let cancelAbsence = SlateTool.create(spec, {
  name: 'Cancel Absence',
  key: 'cancel_absence',
  description: `Cancel an existing absence request in Breathe HR. Optionally provide a cancellation reason. Cancellation retains the record and its history; success requires an exact cancelled-state readback.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      absenceId: z.string().describe('The ID of the absence to cancel'),
      employeeId: z
        .string()
        .optional()
        .describe('Optional employee ID to narrow cancellation readback'),
      reason: z.string().optional().describe('Reason for cancellation')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the cancellation was successful')
    })
  )
  .handleInvocation(async ctx => {
    const absenceId = requireId(ctx.input.absenceId, 'absenceId');
    const employeeId =
      ctx.input.employeeId === undefined
        ? undefined
        : requireId(ctx.input.employeeId, 'employeeId');
    const client = new Client({ token: ctx.auth.token, environment: ctx.config.environment });
    readOne(
      await client.action(
        'absences',
        absenceId,
        'cancel',
        ctx.input.reason === undefined ? undefined : { reason: ctx.input.reason }
      ),
      'leave_requests',
      absenceId
    );
    let page = 1;
    for (let attempt = 0; attempt < 20; attempt++) {
      const result = await client.list('absences', {
        page,
        per_page: 100,
        employee_id: employeeId,
        exclude_cancelled_absences: false
      });
      const absence = readRows(result, 'absences').find(
        item => requireId(item.id) === absenceId
      );
      if (absence) {
        if (absence.cancelled !== true)
          fail(
            'The exact absence was not confirmed cancelled. Inspect its state before retrying.'
          );
        return {
          output: { success: true },
          message: 'Cancelled the exact absence and verified its retained record.'
        };
      }
      if (!result.pagination?.nextPage || result.pagination.nextPage <= page) break;
      page = result.pagination.nextPage;
    }
    return fail(
      'The exact cancelled absence was not found within the bounded readback. Supply employeeId to narrow the search and inspect retained history before retrying.'
    );
  })
  .build();
