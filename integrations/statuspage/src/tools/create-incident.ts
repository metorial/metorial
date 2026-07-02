import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createIncident = SlateTool.create(spec, {
  name: 'Create Incident',
  key: 'create_incident',
  description: `Create a new incident on the status page. Supports realtime, scheduled, and backfilled (historical) incident types.
- **Realtime**: Set \`status\` to investigating/identified/monitoring/resolved. Notifications are sent to subscribers.
- **Scheduled**: Provide \`scheduledFor\` and \`scheduledUntil\` for planned maintenance.
- **Historical**: Set \`backfilled\` to true and provide \`backfillDate\` for past incidents.

Optionally associate affected components and their statuses.`,
  instructions: [
    'For scheduled incidents, set scheduledFor and scheduledUntil as ISO 8601 timestamps.',
    'Component statuses in componentIds map should be: operational, degraded_performance, partial_outage, major_outage, or under_maintenance.'
  ]
})
  .input(
    z.object({
      name: z.string().describe('Title of the incident'),
      status: z
        .enum(['investigating', 'identified', 'monitoring', 'resolved'])
        .optional()
        .describe('Incident status. Defaults to "investigating" for realtime incidents.'),
      message: z.string().optional().describe('Initial incident update message body'),
      impactOverride: z
        .enum(['none', 'minor', 'major', 'critical'])
        .optional()
        .describe('Override the calculated impact level'),
      componentIds: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Map of component IDs to their status during this incident. E.g. {"comp_id": "partial_outage"}'
        ),
      notifySubscribers: z
        .boolean()
        .optional()
        .describe(
          'Whether to send notifications to subscribers. Defaults to true for realtime.'
        ),
      autoTweetAtBeginning: z
        .boolean()
        .optional()
        .describe('Whether to post a tweet when the incident begins'),
      scheduledFor: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp for when scheduled maintenance begins'),
      scheduledUntil: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp for when scheduled maintenance ends'),
      scheduledRemindPrior: z
        .boolean()
        .optional()
        .describe('Send a reminder to subscribers before the scheduled start'),
      scheduledAutoInProgress: z
        .boolean()
        .optional()
        .describe('Automatically transition to in_progress at the scheduled start time'),
      scheduledAutoCompleted: z
        .boolean()
        .optional()
        .describe('Automatically transition to completed at the scheduled end time'),
      backfilled: z
        .boolean()
        .optional()
        .describe('Whether this is a historical/backfilled incident'),
      backfillDate: z
        .string()
        .optional()
        .describe('Date for the backfilled incident in YYYY-MM-DD format')
    })
  )
  .output(
    z.object({
      incidentId: z.string().describe('Unique identifier of the created incident'),
      name: z.string().describe('Title of the incident'),
      status: z.string().describe('Current status of the incident'),
      impact: z.string().optional().describe('Impact level'),
      shortlink: z.string().optional().nullable().describe('Short URL for the incident'),
      scheduledFor: z.string().optional().nullable().describe('Scheduled start time'),
      scheduledUntil: z.string().optional().nullable().describe('Scheduled end time'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, pageId: ctx.config.pageId });

    let data: Record<string, any> = {
      name: ctx.input.name
    };

    if (ctx.input.status !== undefined) data.status = ctx.input.status;
    if (ctx.input.message !== undefined) data.body = ctx.input.message;
    if (ctx.input.impactOverride !== undefined)
      data.impact_override = ctx.input.impactOverride;
    if (ctx.input.notifySubscribers !== undefined)
      data.deliver_notifications = ctx.input.notifySubscribers;
    if (ctx.input.autoTweetAtBeginning !== undefined)
      data.auto_tweet_at_beginning = ctx.input.autoTweetAtBeginning;
    if (ctx.input.scheduledFor !== undefined) data.scheduled_for = ctx.input.scheduledFor;
    if (ctx.input.scheduledUntil !== undefined)
      data.scheduled_until = ctx.input.scheduledUntil;
    if (ctx.input.scheduledRemindPrior !== undefined)
      data.scheduled_remind_prior = ctx.input.scheduledRemindPrior;
    if (ctx.input.scheduledAutoInProgress !== undefined)
      data.scheduled_auto_in_progress = ctx.input.scheduledAutoInProgress;
    if (ctx.input.scheduledAutoCompleted !== undefined)
      data.scheduled_auto_completed = ctx.input.scheduledAutoCompleted;
    if (ctx.input.backfilled !== undefined) data.backfilled = ctx.input.backfilled;
    if (ctx.input.backfillDate !== undefined) data.backfill_date = ctx.input.backfillDate;

    if (ctx.input.componentIds) {
      data.component_ids = Object.keys(ctx.input.componentIds);
      data.components = ctx.input.componentIds;
    }

    let incident = await client.createIncident(data);

    return {
      output: {
        incidentId: incident.id,
        name: incident.name,
        status: incident.status,
        impact: incident.impact,
        shortlink: incident.shortlink,
        scheduledFor: incident.scheduled_for,
        scheduledUntil: incident.scheduled_until,
        createdAt: incident.created_at
      },
      message: `Created **${incident.status}** incident **${incident.name}** (impact: ${incident.impact || 'none'}).`
    };
  })
  .build();
