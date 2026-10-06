import { SlateTool } from 'slates';
import { z } from 'zod';
import { AshbyClient } from '../lib/client';
import {
  email,
  id,
  invalid,
  optionalString,
  pageInput,
  pageOutput,
  pageSchema,
  row,
  rows,
  str,
  text,
  unexpected,
  warningsSchema
} from '../lib/contracts';
import { spec } from '../spec';

let scheduleOutputSchema = z.object({
  schedule: z
    .object({
      interviewScheduleId: z.string().describe('Interview schedule ID'),
      status: z.string().optional(),
      interviewEvents: z.array(z.record(z.string(), z.unknown())).optional(),
      applicationId: z.string().optional().describe('Associated application ID'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last updated timestamp')
    })
    .optional()
    .describe('Single schedule result (for create, update, cancel)'),
  schedules: z
    .array(
      z.object({
        interviewScheduleId: z.string().describe('Interview schedule ID'),
        status: z.string().optional(),
        interviewEvents: z.array(z.record(z.string(), z.unknown())).optional(),
        applicationId: z.string().optional().describe('Associated application ID'),
        createdAt: z.string().optional().describe('Creation timestamp'),
        updatedAt: z.string().optional().describe('Last updated timestamp')
      })
    )
    .optional()
    .describe('List of schedules (for list action)'),
  nextCursor: z.string().optional().describe('Pagination cursor for the next page')
});

const mapSchedule = (value: unknown) => {
  const schedule = row(value);
  return {
    interviewScheduleId: str(schedule.id),
    applicationId: optionalString(schedule.applicationId),
    createdAt: optionalString(schedule.createdAt),
    updatedAt: optionalString(schedule.updatedAt),
    status: str(schedule.status),
    interviewEvents: rows(schedule.interviewEvents).map(event => ({
      interviewEventId: str(event.id),
      interviewId: str(event.interviewId),
      startTime: event.startTime,
      endTime: event.endTime,
      interviewerUserIds: event.interviewerUserIds
    }))
  };
};

export let manageInterviewScheduleTool = SlateTool.create(spec, {
  name: 'Manage Interview Schedule',
  key: 'manage_interview_schedule',
  description: `Creates, updates, cancels, or lists interview schedules in Ashby. Use this tool to coordinate interview scheduling for candidates in the hiring pipeline.`,
  instructions: [
    'To **create** a schedule, set action to "create" and provide applicationId and interviewEvents.',
    'To update a schedule, provide interviewScheduleId and interviewEvents with exact existing interviewEventId values. Only schedules created by this API key can be updated; feedback deletion is denied.',
    'To **cancel** a schedule, set action to "cancel" and provide interviewScheduleId.',
    'To **list** schedules, set action to "list" with optional pagination parameters.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'cancel', 'list'])
        .describe('The interview schedule action to perform'),
      interviewScheduleId: z
        .string()
        .optional()
        .describe('Interview schedule ID (required for update and cancel)'),
      applicationId: z.string().optional().describe('Application ID (required for create)'),
      interviewEvents: z
        .array(
          z.object({
            interviewId: z
              .string()
              .describe('Interview definition ID from list_organization interviews'),
            interviewEventId: z
              .string()
              .optional()
              .describe('Exact existing event ID from schedule listing; required for update.'),
            startTime: z.string().describe('Start time (ISO 8601)'),
            endTime: z.string().describe('End time (ISO 8601)'),
            interviewerUserIds: z.array(z.string()).describe('User IDs of interviewers')
          })
        )
        .optional()
        .describe('Interview events to schedule (for create action)'),
      cursor: z.string().optional().describe('Pagination cursor (for list action)'),
      syncToken: z.string().optional(),
      perPage: z.number().optional().describe('Number of results per page (for list action)')
    })
  )
  .output(
    scheduleOutputSchema.extend({
      warnings: warningsSchema,
      pageInfo: pageSchema.optional(),
      completedActions: z.array(z.string()).optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = new AshbyClient(ctx.auth),
      input = ctx.input;
    pageInput(input);
    const applicationId =
      input.applicationId === undefined
        ? undefined
        : id(input.applicationId, 'Application ID');
    if (input.action === 'list') {
      const result = await client.list('/interviewSchedule.list', input, { applicationId });
      return {
        output: {
          schedules: rows(result.results).map(mapSchedule),
          ...pageOutput(result),
          warnings: client.warnings
        },
        message: 'Retrieved one interview-schedule page with exact schedule and event IDs.'
      };
    }
    if (input.cursor !== undefined || input.syncToken !== undefined)
      invalid('Pagination and sync tokens apply only to schedule list.');
    const scheduleId =
      input.interviewScheduleId === undefined
        ? undefined
        : id(input.interviewScheduleId, 'Interview schedule ID');
    if (input.action === 'cancel') {
      if (scheduleId === undefined) invalid('Provide interviewScheduleId to cancel.');
      const result = await client.exact(
          '/interviewSchedule.cancel',
          { id: scheduleId },
          scheduleId
        ),
        schedule = mapSchedule(result.results);
      if (schedule.status !== 'Cancelled') unexpected();
      return {
        output: { schedule, warnings: client.warnings },
        message: 'Provider confirmed schedule cancellation. Interview history may remain.'
      };
    }
    if (input.action === 'create' && applicationId === undefined)
      invalid('Provide applicationId to create a schedule.');
    if (input.action === 'update' && scheduleId === undefined)
      invalid(
        'Provide interviewScheduleId to update a schedule. Only schedules created by this API key can be updated.'
      );
    if (!input.interviewEvents?.length) invalid('Provide at least one interview event.');
    if (input.interviewEvents.length > 30)
      invalid('At most 30 events may be submitted in one call.');
    const prepared = input.interviewEvents.map(event => {
      const start = text(event.startTime, 'Event start time'),
        end = text(event.endTime, 'Event end time');
      if (
        !/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(start) ||
        !/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(end) ||
        !Number.isFinite(Date.parse(start)) ||
        !Number.isFinite(Date.parse(end)) ||
        Date.parse(end) <= Date.parse(start)
      )
        invalid(
          'Event start/end must be valid ISO timestamps with timezone and end after start.'
        );
      if (!event.interviewerUserIds.length || event.interviewerUserIds.length > 30)
        invalid('Select from 1 to 30 interviewer user IDs per event.');
      if (input.action === 'update' && event.interviewEventId === undefined)
        invalid(
          'Updating an existing event requires its interviewEventId from schedule listing; interviewId identifies the interview definition and would create another event.'
        );
      return {
        startTime: start,
        endTime: end,
        interviewId: id(event.interviewId, 'Interview definition ID'),
        interviewEventId:
          event.interviewEventId === undefined
            ? undefined
            : id(event.interviewEventId, 'Interview event ID'),
        users: event.interviewerUserIds.map(value => id(value, 'Interviewer user ID'))
      };
    });
    if (input.action === 'update') {
      const selected = row((await client.findSchedule(scheduleId!, applicationId)).results);
      const existing = rows(selected.interviewEvents);
      const selectedIds = prepared.map(event => event.interviewEventId);
      if (new Set(selectedIds).size !== selectedIds.length)
        invalid('Each existing interview event may be updated only once.');
      for (const event of prepared) {
        const native = existing.find(item => item.id === event.interviewEventId);
        if (!native || native.interviewId !== event.interviewId)
          invalid(
            'The event ID and interview definition must belong to the exact selected schedule. Refresh schedule listing before updating.'
          );
      }
    }
    const cache = new Map<string, string>();
    for (const event of prepared)
      for (const userId of event.users)
        if (!cache.has(userId)) {
          const user = row((await client.exact('/user.info', { userId }, userId)).results);
          if (user.isEnabled !== true) invalid('Select an enabled Ashby interviewer.');
          cache.set(userId, email(user.email));
        }
    const events = prepared.map(({ users, ...event }) => ({
      ...event,
      interviewers: users.map(userId => ({ email: cache.get(userId)! }))
    }));
    const body =
      input.action === 'create'
        ? {
            applicationId,
            interviewEvents: events.map(({ interviewEventId: _id, ...event }) => event)
          }
        : {
            interviewScheduleId: scheduleId,
            interviewEvent: events,
            allowFeedbackDeletion: false
          };
    const result =
      input.action === 'create'
        ? await client.post('/interviewSchedule.create', body)
        : await client.exact('/interviewSchedule.update', body, scheduleId!);
    const schedule = mapSchedule(result.results);
    if (applicationId !== undefined && schedule.applicationId !== applicationId) unexpected();
    return {
      output: { schedule, warnings: client.warnings },
      message:
        'Interview-schedule operation accepted. Calendar delivery, feedback and recruiting history may have separate effects.'
    };
  })
  .build();
