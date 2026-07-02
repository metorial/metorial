import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let coinSchema = z.object({
  coinId: z.string().describe('Unique identifier of the coin'),
  name: z.string().describe('Name of the cryptocurrency'),
  symbol: z.string().describe('Ticker symbol of the cryptocurrency'),
  rank: z.number().optional().describe('Market cap rank of the cryptocurrency')
});

let categorySchema = z.object({
  categoryId: z.number().describe('Unique identifier of the category'),
  name: z.string().describe('Name of the event category')
});

let eventSchema = z.object({
  eventId: z.number().describe('Unique identifier of the event'),
  title: z
    .record(z.string(), z.string())
    .describe('Event title in available languages (keyed by language code)'),
  coins: z.array(coinSchema).describe('Cryptocurrencies associated with this event'),
  eventDate: z.string().describe('Date when the event is scheduled to occur'),
  createdDate: z.string().describe('Date when the event was created on CoinMarketCal'),
  categories: z.array(categorySchema).describe('Categories this event belongs to'),
  proof: z.string().describe('Link or evidence supporting the event validity'),
  source: z.string().describe('Source URL or reference for the event'),
  isHot: z.boolean().describe('Whether the event is currently trending'),
  voteCount: z.number().describe('Total number of community votes'),
  positiveVoteCount: z.number().describe('Number of positive community votes'),
  percentage: z.number().describe('Community confidence percentage'),
  canOccurBefore: z.boolean().describe('Whether the event may happen before the listed date'),
  description: z
    .record(z.string(), z.string())
    .describe('Event description in available languages (keyed by language code)')
});

export let searchEvents = SlateTool.create(spec, {
  name: 'Search Events',
  key: 'search_events',
  description: `Search and filter cryptocurrency events from the CoinMarketCal calendar. Supports filtering by date range, specific coins, event categories, and sorting preferences. Results include event details, associated coins, community confidence scores, and source links.`,
  instructions: [
    'Use coin names (e.g., "bitcoin,ethereum") for the coins filter, not ticker symbols.',
    'Use category IDs (numeric) for the categories filter. Use the List Categories tool to discover available category IDs.',
    'Dates must be in YYYY-MM-DD format (e.g., "2024-01-15").'
  ],
  constraints: ['Maximum of 300 results per page.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (default: 1)'),
      maxResults: z
        .number()
        .optional()
        .describe('Maximum number of results per page (default: 16, max: 300)'),
      dateRangeStart: z
        .string()
        .optional()
        .describe('Start date for filtering events (format: YYYY-MM-DD, default: today)'),
      dateRangeEnd: z
        .string()
        .optional()
        .describe(
          'End date for filtering events (format: YYYY-MM-DD, default: furthest event date)'
        ),
      coins: z
        .string()
        .optional()
        .describe(
          'Comma-separated list of coin names to filter by (e.g., "bitcoin,ethereum")'
        ),
      categories: z
        .string()
        .optional()
        .describe('Comma-separated list of category IDs to filter by (e.g., "1,2,3")'),
      sortBy: z
        .enum(['created_desc', 'hot_events'])
        .optional()
        .describe('Sort order for results'),
      showOnly: z
        .enum(['hot_events'])
        .optional()
        .describe('Filter to show only specific types of events')
    })
  )
  .output(
    z.object({
      events: z
        .array(eventSchema)
        .describe('List of cryptocurrency events matching the search criteria'),
      pageCount: z.number().describe('Total number of pages available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getEvents({
      page: ctx.input.page,
      max: ctx.input.maxResults,
      dateRangeStart: ctx.input.dateRangeStart,
      dateRangeEnd: ctx.input.dateRangeEnd,
      coins: ctx.input.coins,
      categories: ctx.input.categories,
      sortBy: ctx.input.sortBy,
      showOnly: ctx.input.showOnly
    });

    let events = result.events.map(e => ({
      eventId: e.id,
      title: e.title ?? {},
      coins: (e.coins ?? []).map(c => ({
        coinId: c.id,
        name: c.name,
        symbol: c.symbol,
        rank: c.rank
      })),
      eventDate: e.date_event,
      createdDate: e.created_date,
      categories: (e.categories ?? []).map(cat => ({
        categoryId: cat.id,
        name: cat.name
      })),
      proof: e.proof ?? '',
      source: e.source ?? '',
      isHot: e.is_hot ?? false,
      voteCount: e.vote_count ?? 0,
      positiveVoteCount: e.positive_vote_count ?? 0,
      percentage: e.percentage ?? 0,
      canOccurBefore: e.can_occur_before ?? false,
      description: e.description ?? {}
    }));

    let eventCount = events.length;
    let coinFilter = ctx.input.coins ? ` for **${ctx.input.coins}**` : '';
    let message = `Found **${eventCount}** event${eventCount !== 1 ? 's' : ''}${coinFilter} (page ${ctx.input.page ?? 1} of ${result.pageCount}).`;

    if (eventCount > 0) {
      let summaries = events.slice(0, 5).map(e => {
        let title = e.title.en ?? Object.values(e.title)[0] ?? 'Untitled';
        let coins = e.coins.map(c => c.symbol).join(', ');
        return `- **${title}** (${coins}) — ${e.eventDate}`;
      });
      message += `\n\n${summaries.join('\n')}`;
      if (eventCount > 5) {
        message += `\n- ...and ${eventCount - 5} more`;
      }
    }

    return {
      output: {
        events,
        pageCount: result.pageCount
      },
      message
    };
  })
  .build();
