import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listEvents = SlateTool.create(spec, {
  name: 'List Events',
  key: 'list_events',
  description: `Retrieve a list of tracked events (clicks, leads, sales) from your workspace. Filter by event type, link, domain, or time range to inspect individual conversion events.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      event: z
        .enum(['clicks', 'leads', 'sales'])
        .optional()
        .describe('Event type to filter by'),
      domain: z.string().optional().describe('Filter by domain'),
      linkId: z.string().optional().describe('Filter by link ID'),
      externalId: z.string().optional().describe('Filter by external ID'),
      interval: z
        .enum(['24h', '7d', '30d', '90d', '1y', 'mtd', 'qtd', 'ytd', 'all'])
        .optional()
        .describe('Time interval'),
      start: z.string().optional().describe('Start date/time in ISO format'),
      end: z.string().optional().describe('End date/time in ISO format'),
      timezone: z.string().optional().describe('IANA timezone code'),
      page: z.number().optional().describe('Page number'),
      pageSize: z.number().optional().describe('Items per page')
    })
  )
  .output(
    z.object({
      events: z.array(z.any()).describe('List of event objects'),
      count: z.number().describe('Number of events returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let events = await client.listEvents({
      event: ctx.input.event,
      domain: ctx.input.domain,
      linkId: ctx.input.linkId,
      externalId: ctx.input.externalId,
      interval: ctx.input.interval,
      start: ctx.input.start,
      end: ctx.input.end,
      timezone: ctx.input.timezone,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    return {
      output: {
        events,
        count: events.length
      },
      message: `Found **${events.length}** ${ctx.input.event ?? 'click'} events`
    };
  })
  .build();
