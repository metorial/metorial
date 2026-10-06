import { SlateTool } from 'slates';
import { z } from 'zod';
import { LastPassClient } from '../lib/client';
import { spec } from '../spec';

let eventSchema = z.object({
  timestamp: z.string().describe('Timestamp of the event (YYYY-MM-DD HH:MM:SS)'),
  username: z.string().describe('Email address of the user who triggered the event'),
  ipAddress: z.string().describe('IP address from which the event originated'),
  action: z
    .string()
    .describe('Type of action performed (e.g. Login, Failed Login Attempt, etc.)'),
  eventData: z.string().describe('Additional data associated with the event')
});

export let getEventReport = SlateTool.create(spec, {
  name: 'Get Event Report',
  key: 'get_event_report',
  description: `Query the audit event log for the LastPass Enterprise account. Retrieve events such as login attempts, password changes, shared folder activity, and administrative actions within a specified date range, using the account reporting time zone. Optionally filter by user and continue with the native next cursor.`,
  instructions: [
    'Specify **from** and **to** dates in `YYYY-MM-DD HH:MM:SS` format.',
    'Optionally provide **user** to filter events for a specific user email.',
    'Optionally provide **search** to filter events by keyword.'
  ],
  constraints: [
    'Maximum of 10,000 events per request; use next to continue. Times use the oldest admin account time zone, or the oldest user account when there are no admins.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      from: z.string().describe('Start date/time for the report (YYYY-MM-DD HH:MM:SS)'),
      to: z.string().describe('End date/time for the report (YYYY-MM-DD HH:MM:SS)'),
      user: z.string().optional().describe('Filter events for a specific user email'),
      search: z
        .string()
        .optional()
        .describe('Search keyword to filter events; omit instead of an empty term'),
      next: z
        .string()
        .optional()
        .describe('Exact native microsecond timestamp returned by the previous report page'),
      admin: z.boolean().optional().describe('True requests admin events only')
    })
  )
  .output(
    z.object({
      next: z
        .string()
        .nullable()
        .optional()
        .describe('Native continuation timestamp; null means no next page'),
      events: z.array(eventSchema).describe('List of audit events'),
      eventCount: z.number().describe('Total number of events returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LastPassClient({
      companyId: ctx.auth.companyId,
      provisioningHash: ctx.auth.provisioningHash
    });

    let result = await client.getEventReport({
      from: ctx.input.from,
      to: ctx.input.to,
      user: ctx.input.user,
      search: ctx.input.search,
      next: ctx.input.next,
      admin: ctx.input.admin
    });

    let mappedEvents = Object.values(result.data).map(e => ({
      timestamp: e.Time,
      username: e.Username,
      ipAddress: e.IP_Address,
      action: e.Action,
      eventData: e.Data
    }));

    let filterDesc = ctx.input.user ? ` for user **${ctx.input.user}**` : '';

    return {
      output: {
        events: mappedEvents,
        next: result.next,
        eventCount: mappedEvents.length
      },
      message: `Retrieved **${mappedEvents.length}** event(s)${filterDesc} from ${ctx.input.from} to ${ctx.input.to}.`
    };
  })
  .build();
