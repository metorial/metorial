import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { FirmaoClient } from '../lib/client';
import { spec } from '../spec';

export let endTimeEntry = SlateTool.create(spec, {
  name: 'End Time Entry',
  key: 'end_time_entry',
  description:
    'Finish an existing work time entry in Firmao by setting its end time. Use the timeEntryId returned by create_time_entry or list_time_entries.'
})
  .input(
    z.object({
      timeEntryId: z.number().int().positive().describe('ID of the existing time entry'),
      dateTimeTo: z.iso
        .datetime({ offset: true })
        .describe('End time as an ISO 8601 timestamp with time zone')
    })
  )
  .output(
    z.object({
      timeEntryId: z.number(),
      dateTimeTo: z.string(),
      updated: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    if (!Number.isFinite(Date.parse(ctx.input.dateTimeTo))) {
      throw createApiServiceError('Provide a valid ISO 8601 end time.');
    }
    let client = new FirmaoClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });
    await client.update('timeentries', ctx.input.timeEntryId, {
      dateTimeTo: ctx.input.dateTimeTo
    });
    return {
      output: {
        timeEntryId: ctx.input.timeEntryId,
        dateTimeTo: ctx.input.dateTimeTo,
        updated: true
      },
      message: `Ended time entry **${ctx.input.timeEntryId}**.`
    };
  })
  .build();
