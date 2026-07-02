import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let logActivity = SlateTool.create(spec, {
  name: 'Log Activity',
  key: 'log_activity',
  description: `Log a new activity (call, email, meeting, text, or other) against a candidate or contact. Optionally link the activity to a specific job order.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      resourceType: z
        .enum(['candidates', 'contacts'])
        .describe('Type of record to log the activity against'),
      resourceId: z.string().describe('ID of the candidate or contact'),
      type: z.enum(['call', 'email', 'meeting', 'text', 'other']).describe('Activity type'),
      notes: z.string().optional().describe('Activity notes/details'),
      date: z.string().optional().describe('Activity date (RFC 3339, defaults to now)'),
      regardingJobId: z.number().optional().describe('Job order ID this activity relates to')
    })
  )
  .output(
    z.object({
      activityId: z.string().describe('ID of the created activity')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: Record<string, any> = {
      type: ctx.input.type
    };
    if (ctx.input.notes) body.notes = ctx.input.notes;
    if (ctx.input.date) body.date = ctx.input.date;
    if (ctx.input.regardingJobId) body.regarding_id = ctx.input.regardingJobId;

    let result: any;
    if (ctx.input.resourceType === 'candidates') {
      result = await client.createCandidateActivity(ctx.input.resourceId, body);
    } else {
      result = await client.createContactActivity(ctx.input.resourceId, body);
    }

    let activityId =
      result?.id?.toString() ?? result?._links?.self?.href?.split('/').pop() ?? '';

    return {
      output: { activityId },
      message: `Logged **${ctx.input.type}** activity on ${ctx.input.resourceType.slice(0, -1)} **${ctx.input.resourceId}** (Activity ID: ${activityId}).`
    };
  })
  .build();

export let getActivity = SlateTool.create(spec, {
  name: 'Get Activity',
  key: 'get_activity',
  description: `Retrieve a single activity record by ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      activityId: z.string().describe('Activity ID')
    })
  )
  .output(
    z.object({
      activityId: z.string().describe('Activity ID'),
      type: z.string().optional().describe('Activity type'),
      notes: z.string().optional().describe('Activity notes'),
      date: z.string().optional().describe('Activity date'),
      createdAt: z.string().optional().describe('Created date'),
      updatedAt: z.string().optional().describe('Updated date'),
      links: z.any().optional().describe('HAL links')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.getActivity(ctx.input.activityId);

    return {
      output: {
        activityId: (data.id ?? ctx.input.activityId).toString(),
        type: data.type,
        notes: data.notes,
        date: data.date,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        links: data._links
      },
      message: `Retrieved activity **${ctx.input.activityId}**.`
    };
  })
  .build();

export let listActivities = SlateTool.create(spec, {
  name: 'List Activities',
  key: 'list_activities',
  description: `List activities with pagination. Returns recent activities across all records.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number'),
      perPage: z.number().optional().describe('Results per page (max: 100)')
    })
  )
  .output(
    z.object({
      activities: z
        .array(
          z.object({
            activityId: z.string().describe('Activity ID'),
            type: z.string().optional().describe('Activity type'),
            notes: z.string().optional().describe('Notes'),
            date: z.string().optional().describe('Date')
          })
        )
        .describe('Activities list'),
      totalCount: z.number().optional().describe('Total count'),
      currentPage: z.number().optional().describe('Current page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.listActivities({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let activities = (data?._embedded?.activities ?? []).map((a: any) => ({
      activityId: a.id?.toString() ?? '',
      type: a.type,
      notes: a.notes,
      date: a.date
    }));

    return {
      output: {
        activities,
        totalCount: data?.total ?? activities.length,
        currentPage: data?.page ?? ctx.input.page ?? 1
      },
      message: `Listed **${activities.length}** activity(ies).`
    };
  })
  .build();
