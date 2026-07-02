import { SlateTool } from 'slates';
import { z } from 'zod';
import { NasaClient } from '../lib/client';
import { spec } from '../spec';

let naturalEventSchema = z.object({
  eventId: z.string().describe('Unique event identifier'),
  title: z.string().describe('Event title'),
  description: z.string().optional().describe('Event description'),
  categories: z
    .array(
      z.object({
        categoryId: z.string().describe('Category identifier'),
        title: z.string().describe('Category title')
      })
    )
    .describe('Event categories'),
  sources: z
    .array(
      z.object({
        sourceId: z.string().describe('Source identifier'),
        url: z.string().describe('Source URL')
      })
    )
    .optional()
    .describe('Event data sources'),
  geometry: z
    .array(
      z.object({
        date: z.string().describe('Date of this geometry point'),
        type: z.string().describe('Geometry type (Point, Polygon)'),
        coordinates: z.any().describe('GeoJSON coordinates')
      })
    )
    .optional()
    .describe('Geographic geometry data for the event'),
  closed: z.string().optional().describe('Date the event was marked closed, if applicable')
});

export let getNaturalEvents = SlateTool.create(spec, {
  name: 'Get Natural Events',
  key: 'get_natural_events',
  description: `Search for natural events tracked by NASA's Earth Observatory Natural Event Tracker (EONET). Find wildfires, storms, volcanoes, earthquakes, sea/lake ice, and other natural events worldwide. Filter by category, status, source, and date range.`,
  instructions: [
    'Common categories: wildfires, severeStorms, volcanoes, seaLakeIce, earthquakes, floods, landslides, drought, dustHaze, tempExtremes, waterColor, manmade.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum(['open', 'closed', 'all'])
        .optional()
        .describe('Filter by event status. Defaults to open events.'),
      category: z
        .string()
        .optional()
        .describe('Filter by category ID (e.g., wildfires, severeStorms, volcanoes)'),
      source: z.string().optional().describe('Filter by source ID'),
      startDate: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      endDate: z.string().optional().describe('End date (YYYY-MM-DD)'),
      limit: z.number().optional().describe('Maximum number of events to return')
    })
  )
  .output(
    z.object({
      title: z.string().describe('Response title'),
      events: z.array(naturalEventSchema).describe('List of natural events'),
      eventCount: z.number().describe('Number of events returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NasaClient({ token: ctx.auth.token });

    let result = await client.getEonetEvents({
      status: ctx.input.status === 'all' ? undefined : ctx.input.status,
      category: ctx.input.category,
      source: ctx.input.source,
      start: ctx.input.startDate,
      end: ctx.input.endDate,
      limit: ctx.input.limit
    });

    let events = (result.events || []).map((e: any) => ({
      eventId: e.id,
      title: e.title,
      description: e.description || undefined,
      categories: (e.categories || []).map((c: any) => ({
        categoryId: c.id,
        title: c.title
      })),
      sources: (e.sources || []).map((s: any) => ({
        sourceId: s.id,
        url: s.url
      })),
      geometry: (e.geometry || []).map((g: any) => ({
        date: g.date,
        type: g.type,
        coordinates: g.coordinates
      })),
      closed: e.closed || undefined
    }));

    return {
      output: {
        title: result.title || 'EONET Events',
        events,
        eventCount: events.length
      },
      message: `Found **${events.length}** natural events${ctx.input.category ? ` in category "${ctx.input.category}"` : ''}${ctx.input.status ? ` (${ctx.input.status})` : ''}.`
    };
  })
  .build();
