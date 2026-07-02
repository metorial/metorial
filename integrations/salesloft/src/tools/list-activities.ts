import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let paginationOutputSchema = z.object({
  perPage: z.number().describe('Results per page'),
  currentPage: z.number().describe('Current page number'),
  nextPage: z.number().nullable().describe('Next page number'),
  prevPage: z.number().nullable().describe('Previous page number')
});

let emailActivitySchema = z.object({
  emailId: z.number().describe('Email activity ID'),
  subject: z.string().nullable().optional().describe('Email subject'),
  status: z.string().nullable().optional().describe('Email status'),
  bounced: z.boolean().nullable().optional().describe('Whether the email bounced'),
  clickCount: z.number().nullable().optional().describe('Number of clicks'),
  viewCount: z.number().nullable().optional().describe('Number of views/opens'),
  replyCount: z.number().nullable().optional().describe('Number of replies'),
  sentAt: z.string().nullable().optional().describe('When the email was sent'),
  createdAt: z.string().nullable().optional().describe('Creation timestamp'),
  updatedAt: z.string().nullable().optional().describe('Last update timestamp'),
  personId: z.number().nullable().optional().describe('Associated person ID'),
  userId: z.number().nullable().optional().describe('Sender user ID'),
  cadenceId: z.number().nullable().optional().describe('Associated cadence ID'),
  stepId: z.number().nullable().optional().describe('Associated cadence step ID')
});

let mapEmailActivity = (raw: any) => ({
  emailId: raw.id,
  subject: raw.subject,
  status: raw.status,
  bounced: raw.bounced,
  clickCount: raw.click_count,
  viewCount: raw.view_count,
  replyCount: raw.reply_count,
  sentAt: raw.sent_at,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
  personId: raw.person?.id ?? null,
  userId: raw.user?.id ?? null,
  cadenceId: raw.cadence?.id ?? null,
  stepId: raw.step?.id ?? null
});

export let listEmailActivities = SlateTool.create(spec, {
  name: 'List Email Activities',
  key: 'list_email_activities',
  description: `List email activities in SalesLoft. Returns sent emails with tracking data including opens, clicks, replies, and bounces. Filter by person to see all emails sent to a specific contact.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (1-100, default: 25)'),
      sortBy: z.string().optional().describe('Field to sort by'),
      sortDirection: z.enum(['ASC', 'DESC']).optional().describe('Sort direction'),
      personId: z.number().optional().describe('Filter by person ID')
    })
  )
  .output(
    z.object({
      emails: z.array(emailActivitySchema).describe('List of email activities'),
      paging: paginationOutputSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listEmailActivities(ctx.input);
    let emails = result.data.map(mapEmailActivity);

    return {
      output: {
        emails,
        paging: result.metadata.paging
      },
      message: `Found **${emails.length}** email activities (page ${result.metadata.paging.currentPage}).`
    };
  })
  .build();

let callActivitySchema = z.object({
  callId: z.number().describe('Call activity ID'),
  to: z.string().nullable().optional().describe('Called phone number'),
  duration: z.number().nullable().optional().describe('Call duration in seconds'),
  sentiment: z.string().nullable().optional().describe('Call sentiment'),
  disposition: z.string().nullable().optional().describe('Call disposition'),
  status: z.string().nullable().optional().describe('Call status'),
  note: z.string().nullable().optional().describe('Call notes'),
  createdAt: z.string().nullable().optional().describe('Creation timestamp'),
  updatedAt: z.string().nullable().optional().describe('Last update timestamp'),
  personId: z.number().nullable().optional().describe('Associated person ID'),
  userId: z.number().nullable().optional().describe('Caller user ID'),
  cadenceId: z.number().nullable().optional().describe('Associated cadence ID')
});

let mapCallActivity = (raw: any) => ({
  callId: raw.id,
  to: raw.to,
  duration: raw.duration,
  sentiment: raw.sentiment,
  disposition: raw.disposition,
  status: raw.status,
  note: raw.note,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
  personId: raw.person?.id ?? null,
  userId: raw.user?.id ?? null,
  cadenceId: raw.cadence?.id ?? null
});

export let listCallActivities = SlateTool.create(spec, {
  name: 'List Call Activities',
  key: 'list_call_activities',
  description: `List call activities in SalesLoft. Returns call records with duration, sentiment, disposition, and notes. Filter by person to see all calls made to a specific contact.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (1-100, default: 25)'),
      sortBy: z.string().optional().describe('Field to sort by'),
      sortDirection: z.enum(['ASC', 'DESC']).optional().describe('Sort direction'),
      personId: z.number().optional().describe('Filter by person ID')
    })
  )
  .output(
    z.object({
      calls: z.array(callActivitySchema).describe('List of call activities'),
      paging: paginationOutputSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listCallActivities(ctx.input);
    let calls = result.data.map(mapCallActivity);

    return {
      output: {
        calls,
        paging: result.metadata.paging
      },
      message: `Found **${calls.length}** call activities (page ${result.metadata.paging.currentPage}).`
    };
  })
  .build();

export let logCall = SlateTool.create(spec, {
  name: 'Log Call',
  key: 'log_call',
  description: `Log a new call record in SalesLoft. Used to record calls made through third-party dialers or external systems. Associates the call with a person and optionally a cadence.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      personId: z.number().describe('ID of the person called'),
      to: z.string().optional().describe('Phone number called'),
      duration: z.number().optional().describe('Call duration in seconds'),
      disposition: z
        .string()
        .optional()
        .describe('Call disposition (e.g., "Connected", "No Answer", "Left Voicemail")'),
      sentiment: z
        .string()
        .optional()
        .describe('Call sentiment (e.g., "Positive", "Neutral", "Negative")'),
      note: z.string().optional().describe('Call notes'),
      userId: z
        .number()
        .optional()
        .describe('ID of the user who made the call (defaults to authenticated user)')
    })
  )
  .output(callActivitySchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: Record<string, any> = {
      person_id: ctx.input.personId
    };
    if (ctx.input.to) body.to = ctx.input.to;
    if (ctx.input.duration !== undefined) body.duration = ctx.input.duration;
    if (ctx.input.disposition) body.disposition = ctx.input.disposition;
    if (ctx.input.sentiment) body.sentiment = ctx.input.sentiment;
    if (ctx.input.note) body.note = ctx.input.note;
    if (ctx.input.userId) body.user_id = ctx.input.userId;

    let call = await client.createCall(body);
    let output = mapCallActivity(call);

    return {
      output,
      message: `Logged call to person ${ctx.input.personId}${ctx.input.duration ? ` (${ctx.input.duration}s)` : ''}.`
    };
  })
  .build();
