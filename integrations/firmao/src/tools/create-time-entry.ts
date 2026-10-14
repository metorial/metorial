import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { FirmaoClient } from '../lib/client';
import { spec } from '../spec';

export let createTimeEntry = SlateTool.create(spec, {
  name: 'Create Time Entry',
  key: 'create_time_entry',
  description: `Create a work time entry in Firmao. Entries can have start-only (clock in), end-only (clock out), or both start and end times. Each entry is linked to a user and can optionally be linked to a task.`
})
  .input(
    z.object({
      userId: z.number().describe('ID of the user for this time entry'),
      dateTimeFrom: z
        .string()
        .optional()
        .describe('Start time (ISO 8601). Omit for end-only entry.'),
      dateTimeTo: z
        .string()
        .optional()
        .describe('End time (ISO 8601). Omit for start-only entry.'),
      taskId: z.number().optional().describe('Task ID to link this entry to'),
      description: z.string().optional().describe('Description of work performed'),
      type: z.string().optional().describe('Entry type (e.g., TASK, LEAVE)')
    })
  )
  .output(
    z.object({
      timeEntryId: z.number().describe('ID of the created time entry')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.dateTimeFrom && !ctx.input.dateTimeTo) {
      throw createApiServiceError('Provide a start time, an end time, or both.');
    }
    for (let value of [ctx.input.dateTimeFrom, ctx.input.dateTimeTo]) {
      if (value !== undefined && !z.iso.datetime({ offset: true }).safeParse(value).success) {
        throw createApiServiceError('Time-entry dates must be valid ISO 8601 timestamps.');
      }
    }
    if (
      ctx.input.dateTimeFrom &&
      ctx.input.dateTimeTo &&
      Date.parse(ctx.input.dateTimeTo) < Date.parse(ctx.input.dateTimeFrom)
    ) {
      throw createApiServiceError('The end time must be on or after the start time.');
    }
    let client = new FirmaoClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let body: Record<string, any> = {
      user: ctx.input.userId,
      type: ctx.input.type ?? 'TASK'
    };

    if (ctx.input.dateTimeFrom) body.dateTimeFrom = ctx.input.dateTimeFrom;
    if (ctx.input.dateTimeTo) body.dateTimeTo = ctx.input.dateTimeTo;
    if (ctx.input.taskId !== undefined) body.task = ctx.input.taskId;
    if (ctx.input.description) body.description = ctx.input.description;

    let result = await client.create('timeentries', body);
    let entryChange = result?.changelog?.find(
      (change: { modification?: string; newValueClass?: string }) =>
        change.modification === 'ATTACH' && change.newValueClass === 'timeentry'
    );
    let createdId = Number(entryChange?.newValueId ?? result?.id ?? result?.data?.id);
    if (!Number.isSafeInteger(createdId) || createdId <= 0) {
      throw createApiServiceError(
        'Firmao accepted the request but did not return a time-entry ID. Check list_time_entries before retrying.',
        { reason: 'firmao_invalid_response' }
      );
    }

    return {
      output: {
        timeEntryId: createdId
      },
      message: `Created time entry (ID: ${createdId}) for user ${ctx.input.userId}.`
    };
  })
  .build();
