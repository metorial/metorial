import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let visitorSchema = z
  .object({
    visitorId: z.string().optional().describe('Unique visitor identifier'),
    ip: z.string().optional().describe('Visitor IP address'),
    name: z.string().optional().describe('Visitor name'),
    email: z.string().optional().describe('Visitor email address'),
    emailHash: z.string().optional().describe('Hashed visitor email'),
    geolocation: z
      .object({
        countryCode: z.string().optional().describe('Two-letter country code'),
        city: z.string().optional().describe('City name'),
        region: z.string().optional().describe('Region/state code')
      })
      .optional()
      .describe('Visitor geolocation data'),
    params: z.record(z.string(), z.unknown()).optional().describe('Custom visitor parameters'),
    firstSessionTimestamp: z
      .string()
      .optional()
      .describe("Timestamp of the visitor's first session"),
    lastSessionTimestamp: z
      .string()
      .optional()
      .describe("Timestamp of the visitor's last session")
  })
  .describe('Visitor information');

let sessionSchema = z.object({
  sessionId: z.string().describe('Unique session identifier'),
  websiteId: z.string().describe('Associated website ID'),
  visitorId: z.string().optional().describe('Visitor identifier'),
  creationTimestamp: z.string().optional().describe('Session creation timestamp'),
  endTimestamp: z.string().optional().describe('Session end timestamp'),
  duration: z.number().optional().describe('Session duration in seconds'),
  activeTime: z.number().optional().describe('Active time in seconds'),
  engagementScore: z.number().optional().describe('Engagement score (0-100)'),
  startUrl: z.string().optional().describe('URL where session started'),
  endUrl: z.string().optional().describe('URL where session ended'),
  referrer: z.string().optional().describe('Referrer URL'),
  device: z.string().optional().describe('Device type (desktop, mobile, tablet)'),
  browser: z
    .object({
      name: z.string().optional(),
      version: z.string().optional()
    })
    .optional()
    .describe('Browser information'),
  os: z
    .object({
      name: z.string().optional(),
      version: z.string().optional()
    })
    .optional()
    .describe('Operating system information'),
  resolution: z
    .object({
      width: z.number().optional(),
      height: z.number().optional(),
      resolution: z.string().optional()
    })
    .optional()
    .describe('Screen resolution'),
  seen: z.boolean().optional().describe('Whether the session has been viewed'),
  visitorFirstSession: z
    .boolean()
    .optional()
    .describe("Whether this is the visitor's first session"),
  tags: z.array(z.string()).optional().describe('Session tags'),
  utm: z
    .object({
      source: z.string().optional(),
      medium: z.string().optional(),
      campaign: z.string().optional()
    })
    .optional()
    .describe('UTM tracking parameters'),
  visitor: visitorSchema.optional(),
  eventsStatistics: z
    .object({
      clicks: z.number().optional(),
      errorClicks: z.number().optional(),
      rageClicks: z.number().optional(),
      errorLogs: z.number().optional(),
      netErrors: z.number().optional()
    })
    .optional()
    .describe('Event statistics for this session')
});

let mapSession = (s: any) => ({
  sessionId: s.id || s.session_id,
  websiteId: s.website_id,
  visitorId: s.visitor_id,
  creationTimestamp: s.creation_timestamp,
  endTimestamp: s.end_timestamp,
  duration: s.duration,
  activeTime: s.active_time,
  engagementScore: s.engagment_score ?? s.engagement_score,
  startUrl: s.start_url,
  endUrl: s.end_url,
  referrer: s.referrer,
  device: s.device,
  browser: s.browser,
  os: s.os,
  resolution: s.resolution,
  seen: s.seen,
  visitorFirstSession: s.visitor_first_session,
  tags: s.tags,
  utm: s.utm,
  visitor: s.visitor
    ? {
        visitorId: s.visitor.id,
        ip: s.visitor.ip,
        name: s.visitor.name,
        email: s.visitor.email,
        emailHash: s.visitor.email_hash,
        geolocation: s.visitor.geolocation
          ? {
              countryCode: s.visitor.geolocation.country_code,
              city: s.visitor.geolocation.city,
              region: s.visitor.geolocation.region
            }
          : undefined,
        params: s.visitor.params,
        firstSessionTimestamp: s.visitor.first_session_timestamp,
        lastSessionTimestamp: s.visitor.last_session_timestamp
      }
    : undefined,
  eventsStatistics: s.events_statistics
    ? {
        clicks: s.events_statistics.clicks,
        errorClicks: s.events_statistics.error_clicks,
        rageClicks: s.events_statistics.rage_clicks,
        errorLogs: s.events_statistics.error_logs,
        netErrors: s.events_statistics.net_errors
      }
    : undefined
});

export let listSessions = SlateTool.create(spec, {
  name: 'List Sessions',
  key: 'list_sessions',
  description: `List and filter recorded user sessions from LiveSession. Retrieve session data including visitor information, geolocation, device details, UTM parameters, and event statistics. Supports filtering by email, visitor ID, and date range with pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (0-indexed, max 10000)'),
      size: z.number().optional().describe('Items per page (max 100, default 25)'),
      email: z.string().optional().describe('Filter sessions by visitor email'),
      visitorId: z.string().optional().describe('Filter sessions by visitor ID'),
      timezone: z
        .string()
        .optional()
        .describe('IANA timezone for date filtering (e.g. "America/New_York")'),
      dateFrom: z
        .string()
        .optional()
        .describe('Start date filter (ISO 8601 or relative: "today", "yesterday", etc.)'),
      dateTo: z
        .string()
        .optional()
        .describe('End date filter (ISO 8601 or relative: "today", "yesterday", etc.)')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total number of matching sessions'),
      page: z.number().describe('Current page number'),
      pageSize: z.number().describe('Number of items per page'),
      sessions: z.array(sessionSchema).describe('List of session records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.listSessions({
      page: ctx.input.page,
      size: ctx.input.size,
      email: ctx.input.email,
      visitorId: ctx.input.visitorId,
      timezone: ctx.input.timezone,
      dateFrom: ctx.input.dateFrom,
      dateTo: ctx.input.dateTo
    });

    let sessions = (result.sessions || []).map(mapSession);

    return {
      output: {
        total: result.total || 0,
        page: result.page?.num ?? 0,
        pageSize: result.page?.size ?? 25,
        sessions
      },
      message: `Found **${result.total || 0}** sessions (showing page ${(result.page?.num ?? 0) + 1}, ${sessions.length} results).`
    };
  })
  .build();
