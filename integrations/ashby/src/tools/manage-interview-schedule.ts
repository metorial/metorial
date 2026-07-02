import { SlateTool } from 'slates';
import { z } from 'zod';
import { AshbyClient } from '../lib/client';
import { spec } from '../spec';

let scheduleOutputSchema = z.object({
  schedule: z
    .object({
      interviewScheduleId: z.string().describe('Interview schedule ID'),
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
        applicationId: z.string().optional().describe('Associated application ID'),
        createdAt: z.string().optional().describe('Creation timestamp'),
        updatedAt: z.string().optional().describe('Last updated timestamp')
      })
    )
    .optional()
    .describe('List of schedules (for list action)'),
  nextCursor: z.string().optional().describe('Pagination cursor for the next page')
});

let mapSchedule = (s: any) => ({
  interviewScheduleId: s.id,
  applicationId: s.applicationId || undefined,
  createdAt: s.createdAt || undefined,
  updatedAt: s.updatedAt || undefined
});

export let manageInterviewScheduleTool = SlateTool.create(spec, {
  name: 'Manage Interview Schedule',
  key: 'manage_interview_schedule',
  description: `Creates, updates, cancels, or lists interview schedules in Ashby. Use this tool to coordinate interview scheduling for candidates in the hiring pipeline.`,
  instructions: [
    'To **create** a schedule, set action to "create" and provide applicationId and interviewEvents.',
    'To **update** a schedule, set action to "update" and provide interviewScheduleId.',
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
            interviewId: z.string().describe('Interview ID'),
            startTime: z.string().describe('Start time (ISO 8601)'),
            endTime: z.string().describe('End time (ISO 8601)'),
            interviewerUserIds: z.array(z.string()).describe('User IDs of interviewers')
          })
        )
        .optional()
        .describe('Interview events to schedule (for create action)'),
      cursor: z.string().optional().describe('Pagination cursor (for list action)'),
      perPage: z.number().optional().describe('Number of results per page (for list action)')
    })
  )
  .output(scheduleOutputSchema)
  .handleInvocation(async ctx => {
    let client = new AshbyClient({ token: ctx.auth.token });
    let { action, interviewScheduleId, applicationId, interviewEvents, cursor, perPage } =
      ctx.input;

    if (action === 'create') {
      if (!applicationId)
        throw new Error('applicationId is required to create an interview schedule');
      if (!interviewEvents || interviewEvents.length === 0)
        throw new Error('interviewEvents are required to create an interview schedule');

      let result = await client.createInterviewSchedule({
        applicationId,
        interviewEvents
      });

      let schedule = mapSchedule(result.results);

      return {
        output: { schedule },
        message: `Created interview schedule **${schedule.interviewScheduleId}** for application ${applicationId}.`
      };
    }

    if (action === 'update') {
      if (!interviewScheduleId)
        throw new Error('interviewScheduleId is required to update an interview schedule');

      let params: Record<string, any> = {};
      if (interviewEvents) params.interviewEvents = interviewEvents;

      let result = await client.updateInterviewSchedule(interviewScheduleId, params);

      let schedule = mapSchedule(result.results);

      return {
        output: { schedule },
        message: `Updated interview schedule **${schedule.interviewScheduleId}**.`
      };
    }

    if (action === 'cancel') {
      if (!interviewScheduleId)
        throw new Error('interviewScheduleId is required to cancel an interview schedule');

      let result = await client.cancelInterviewSchedule(interviewScheduleId);

      let schedule = mapSchedule(result.results);

      return {
        output: { schedule },
        message: `Cancelled interview schedule **${interviewScheduleId}**.`
      };
    }

    // action === 'list'
    let result = await client.listInterviewSchedules({
      cursor,
      perPage
    });

    let schedules = (result.results || []).map(mapSchedule);

    return {
      output: {
        schedules,
        nextCursor: result.moreDataAvailable ? result.nextCursor : undefined
      },
      message: `Found **${schedules.length}** interview schedules${result.moreDataAvailable ? ' (more available)' : ''}.`
    };
  })
  .build();
