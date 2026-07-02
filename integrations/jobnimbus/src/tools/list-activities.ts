import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listActivities = SlateTool.create(spec, {
  name: 'List Activities',
  key: 'list_activities',
  description: `List activities (notes, status changes, etc.) in JobNimbus. Filter by parent contact/job to see the activity history for a specific record.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      parentRecordId: z.string().optional().describe('Filter by parent contact or job ID'),
      recordTypeName: z.string().optional().describe('Filter by activity type (e.g. "Note")'),
      from: z.number().optional().describe('Pagination offset (0-based). Defaults to 0.'),
      size: z
        .number()
        .optional()
        .describe('Number of results per page. Defaults to 25. Max 200.')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of matching activities'),
      activities: z
        .array(
          z.object({
            activityId: z.string().describe('Unique JobNimbus ID of the activity'),
            note: z.string().optional().describe('Activity note content'),
            recordTypeName: z.string().optional().describe('Activity type'),
            parentRecordId: z.string().optional().describe('Parent record ID'),
            parentRecordName: z.string().optional().describe('Parent record name'),
            isStatusChange: z
              .boolean()
              .optional()
              .describe('Whether this is a status change activity'),
            oldStatus: z
              .string()
              .optional()
              .describe('Previous status (for status change activities)'),
            newStatus: z
              .string()
              .optional()
              .describe('New status (for status change activities)'),
            createdByName: z.string().optional().describe('Name of the creator'),
            dateCreated: z.number().optional().describe('Unix timestamp of creation')
          })
        )
        .describe('List of activities')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let mustClauses: any[] = [];

    if (ctx.input.parentRecordId) {
      mustClauses.push({ term: { primary: ctx.input.parentRecordId } });
    }
    if (ctx.input.recordTypeName) {
      mustClauses.push({ term: { record_type_name: ctx.input.recordTypeName } });
    }

    let filter = mustClauses.length > 0 ? { must: mustClauses } : undefined;

    let result = await client.listActivities({
      from: ctx.input.from,
      size: ctx.input.size,
      filter
    });

    let activities = (result.results || []).map((a: any) => ({
      activityId: a.jnid,
      note: a.note,
      recordTypeName: a.record_type_name,
      parentRecordId: a.primary,
      parentRecordName: a.primary_name,
      isStatusChange: a.is_status_change,
      oldStatus: a.primary_old_status,
      newStatus: a.primary_new_status,
      createdByName: a.created_by_name,
      dateCreated: a.date_created
    }));

    return {
      output: {
        totalCount: result.count || 0,
        activities
      },
      message: `Found **${result.count || 0}** activities. Returned ${activities.length} results.`
    };
  })
  .build();
