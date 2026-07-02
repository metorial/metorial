import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getActivities = SlateTool.create(spec, {
  name: 'Get Activities',
  key: 'get_activities',
  description: `Retrieve activities from Pipedrive. Fetch a single activity by ID or list activities with optional filtering by user, type, or completion status.
Returns activity properties including subject, type, due date, linked entities, and completion status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      activityId: z.number().optional().describe('Specific activity ID to fetch'),
      userId: z.number().optional().describe('Filter by owner user ID'),
      filterId: z.number().optional().describe('Filter ID for custom filtering'),
      type: z
        .string()
        .optional()
        .describe('Filter by activity type key (e.g. "call", "meeting")'),
      done: z
        .enum(['0', '1'])
        .optional()
        .describe('Filter by done status: 0=not done, 1=done'),
      start: z.number().optional().describe('Pagination start (0-based)'),
      limit: z.number().optional().describe('Number of results to return (max 500)')
    })
  )
  .output(
    z.object({
      activities: z
        .array(
          z.object({
            activityId: z.number().describe('Activity ID'),
            subject: z.string().optional().describe('Activity subject'),
            type: z.string().optional().describe('Activity type'),
            dueDate: z.string().optional().nullable().describe('Due date'),
            dueTime: z.string().optional().nullable().describe('Due time'),
            duration: z.string().optional().nullable().describe('Duration'),
            done: z.boolean().optional().describe('Whether done'),
            dealId: z.number().optional().nullable().describe('Linked deal ID'),
            personId: z.number().optional().nullable().describe('Linked person ID'),
            personName: z.string().optional().nullable().describe('Linked person name'),
            organizationId: z.number().optional().nullable().describe('Linked org ID'),
            organizationName: z.string().optional().nullable().describe('Linked org name'),
            note: z.string().optional().nullable().describe('Activity notes'),
            location: z.string().optional().nullable().describe('Activity location'),
            addTime: z.string().optional().describe('Creation timestamp')
          })
        )
        .describe('List of activities'),
      totalCount: z.number().optional().describe('Total matching count'),
      hasMore: z.boolean().optional().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.activityId) {
      let result = await client.getActivity(ctx.input.activityId);
      let a = result?.data;
      return {
        output: {
          activities: a
            ? [
                {
                  activityId: a.id,
                  subject: a.subject,
                  type: a.type,
                  dueDate: a.due_date,
                  dueTime: a.due_time,
                  duration: a.duration,
                  done: a.done,
                  dealId: a.deal_id,
                  personId: a.person_id,
                  personName: a.person_name,
                  organizationId: a.org_id,
                  organizationName: a.org_name,
                  note: a.note,
                  location: a.location,
                  addTime: a.add_time
                }
              ]
            : [],
          totalCount: a ? 1 : 0
        },
        message: a ? `Found activity **"${a.subject}"** (ID: ${a.id}).` : 'Activity not found.'
      };
    }

    let result = await client.getActivities({
      start: ctx.input.start,
      limit: ctx.input.limit,
      userId: ctx.input.userId,
      filterId: ctx.input.filterId,
      type: ctx.input.type,
      done: ctx.input.done !== undefined ? Number(ctx.input.done) : undefined
    });

    let activities = (result?.data || []).map((a: any) => ({
      activityId: a.id,
      subject: a.subject,
      type: a.type,
      dueDate: a.due_date,
      dueTime: a.due_time,
      duration: a.duration,
      done: a.done,
      dealId: a.deal_id,
      personId: a.person_id,
      personName: a.person_name,
      organizationId: a.org_id,
      organizationName: a.org_name,
      note: a.note,
      location: a.location,
      addTime: a.add_time
    }));

    return {
      output: {
        activities,
        totalCount: result?.additional_data?.pagination?.total_count,
        hasMore: result?.additional_data?.pagination?.more_items_in_collection ?? false
      },
      message: `Found **${activities.length}** activity(ies).`
    };
  });
