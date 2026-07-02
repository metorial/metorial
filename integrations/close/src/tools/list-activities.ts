import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let activitySchema = z.object({
  activityId: z.string().describe('Unique identifier for the activity'),
  type: z.string().describe('Activity type (e.g. Call, Email, Meeting, Note, SMS)'),
  leadId: z.string().describe('Lead ID associated with this activity'),
  userId: z.string().optional().describe('User ID who performed the activity'),
  contactId: z.string().optional().describe('Contact ID associated with this activity'),
  dateCreated: z.string().describe('ISO 8601 timestamp when the activity was created'),
  activityAt: z.string().optional().describe('ISO 8601 timestamp when the activity occurred'),
  subject: z.string().optional().describe('Subject line (for emails and meetings)'),
  bodyPreview: z.string().optional().describe('Truncated preview of the activity body')
});

export let listActivities = SlateTool.create(spec, {
  name: 'List Activities',
  key: 'list_activities',
  description: `List activities in Close CRM with optional filters. Activities include calls, emails, notes, meetings, SMS, and other interaction types logged against leads and contacts.`,
  instructions: [
    'Use **activityType** to filter by a single type (e.g. "Call", "Email", "Note").',
    'Use **activityTypes** to filter by multiple types at once.',
    'Use **dateCreatedAfter** and **dateCreatedBefore** to filter by creation date range (ISO 8601 format).',
    'Results are paginated. Use **skip** to paginate through results.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      leadId: z.string().optional().describe('Filter activities by lead ID'),
      userId: z
        .string()
        .optional()
        .describe('Filter activities by the user who performed them'),
      contactId: z.string().optional().describe('Filter activities by contact ID'),
      activityType: z
        .enum(['Call', 'Email', 'Meeting', 'Note', 'SMS'])
        .optional()
        .describe('Filter by a single activity type'),
      activityTypes: z
        .array(z.string())
        .optional()
        .describe('Filter by multiple activity types (e.g. ["Call", "Email"])'),
      dateCreatedAfter: z
        .string()
        .optional()
        .describe('Return activities created after this ISO 8601 timestamp'),
      dateCreatedBefore: z
        .string()
        .optional()
        .describe('Return activities created before this ISO 8601 timestamp'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of results to return (default 100)'),
      skip: z.number().optional().describe('Number of results to skip for pagination')
    })
  )
  .output(
    z.object({
      activities: z.array(activitySchema).describe('List of activities matching the filters'),
      totalResults: z.number().describe('Total number of activities matching the filters'),
      hasMore: z
        .boolean()
        .describe('Whether there are more results available beyond this page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });

    let limit = ctx.input.limit ?? 100;

    let result = await client.listActivities({
      leadId: ctx.input.leadId,
      userId: ctx.input.userId,
      contactId: ctx.input.contactId,
      type: ctx.input.activityType,
      typeIn: ctx.input.activityTypes,
      dateCreatedGt: ctx.input.dateCreatedAfter,
      dateCreatedLt: ctx.input.dateCreatedBefore,
      limit,
      skip: ctx.input.skip
    });

    let activities = (result.data || []).map((a: any) => ({
      activityId: a.id,
      type: a._type || a.type,
      leadId: a.lead_id,
      userId: a.user_id,
      contactId: a.contact_id,
      dateCreated: a.date_created,
      activityAt: a.activity_at,
      subject: a.subject,
      bodyPreview: a.body_text
        ? a.body_text.substring(0, 200) + (a.body_text.length > 200 ? '...' : '')
        : a.note
          ? a.note.substring(0, 200) + (a.note.length > 200 ? '...' : '')
          : undefined
    }));

    let totalResults = result.total_results ?? activities.length;
    let hasMore = (ctx.input.skip ?? 0) + activities.length < totalResults;

    return {
      output: {
        activities,
        totalResults,
        hasMore
      },
      message: `Listed ${activities.length} activities${totalResults > activities.length ? ` (${totalResults} total)` : ''}.`
    };
  })
  .build();
