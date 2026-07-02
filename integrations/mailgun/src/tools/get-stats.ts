import { SlateTool } from 'slates';
import { z } from 'zod';
import { MailgunClient } from '../lib/client';
import { spec } from '../spec';

export let getStats = SlateTool.create(spec, {
  name: 'Get Stats',
  key: 'get_stats',
  description: `Get email sending statistics from Mailgun's legacy Stats API for a domain. Returns aggregate counts for events like accepted, delivered, failed, opened, clicked, unsubscribed, and complained over a time range.
Prefer the Query Metrics tool for current analytics unless you specifically need the legacy Stats API.`,
  instructions: [
    'At least one event type must be specified.',
    'Use duration for relative time ranges (e.g. "7d" for 7 days, "1m" for 1 month).',
    'Use start/end for absolute date ranges.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      domain: z.string().describe('Domain name to get stats for'),
      events: z
        .array(
          z.enum([
            'accepted',
            'delivered',
            'failed',
            'opened',
            'clicked',
            'unsubscribed',
            'complained',
            'stored'
          ])
        )
        .min(1)
        .describe('Event types to get statistics for'),
      start: z.string().optional().describe('Start date for the stats period'),
      end: z.string().optional().describe('End date for the stats period'),
      resolution: z
        .enum(['hour', 'day', 'month'])
        .optional()
        .describe('Time resolution for the stats (default: day)'),
      duration: z
        .string()
        .optional()
        .describe('Duration for relative time range (e.g. "7d", "1m")')
    })
  )
  .output(
    z.object({
      stats: z.array(
        z.object({
          time: z.string().describe('Timestamp for this data point'),
          accepted: z
            .object({ incoming: z.number(), outgoing: z.number(), total: z.number() })
            .optional(),
          delivered: z
            .object({ smtp: z.number(), http: z.number(), total: z.number() })
            .optional(),
          failed: z
            .object({
              permanentTotal: z.number(),
              temporaryTotal: z.number()
            })
            .optional(),
          opened: z.object({ total: z.number() }).optional(),
          clicked: z.object({ total: z.number() }).optional(),
          unsubscribed: z.object({ total: z.number() }).optional(),
          complained: z.object({ total: z.number() }).optional(),
          stored: z.object({ total: z.number() }).optional()
        })
      ),
      start: z.string().describe('Start of the stats period'),
      end: z.string().describe('End of the stats period'),
      resolution: z.string().describe('Time resolution used')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailgunClient({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.getStats(ctx.input.domain, {
      event: ctx.input.events,
      start: ctx.input.start,
      end: ctx.input.end,
      resolution: ctx.input.resolution,
      duration: ctx.input.duration
    });

    let stats = (result.stats || []).map(s => ({
      time: s.time,
      accepted: s.accepted
        ? {
            incoming: s.accepted.incoming,
            outgoing: s.accepted.outgoing,
            total: s.accepted.total
          }
        : undefined,
      delivered: s.delivered
        ? {
            smtp: s.delivered.smtp,
            http: s.delivered.http,
            total: s.delivered.total
          }
        : undefined,
      failed: s.failed
        ? {
            permanentTotal: s.failed.permanent?.total ?? 0,
            temporaryTotal: s.failed.temporary?.total ?? 0
          }
        : undefined,
      opened: s.opened,
      clicked: s.clicked,
      unsubscribed: s.unsubscribed,
      complained: s.complained,
      stored: s.stored
    }));

    return {
      output: {
        stats,
        start: result.start,
        end: result.end,
        resolution: result.resolution
      },
      message: `Retrieved **${stats.length}** data point(s) for domain **${ctx.input.domain}** (${result.resolution} resolution).`
    };
  })
  .build();
