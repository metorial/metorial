import { SlateTool } from 'slates';
import { z } from 'zod';
import { V2Client } from '../lib/v2-client';
import {
  cancellationListInput,
  cancellationPageSchema,
  categoryListSchema,
  coinListInput,
  coinPageSchema,
  coinV2Schema,
  eventListInput,
  eventPageSchema,
  eventV2Schema,
  usageSchema
} from '../lib/v2-schemas';
import { spec } from '../spec';

export const listEvents = SlateTool.create(spec, {
  key: 'list_events',
  name: 'List Events',
  description:
    'Search the current CoinMarketCal V2 event catalog by coin, category, date, keyword, or impact. Returns one page with a cursor for the next page. Requires a V2 API key.',
  instructions: [
    'Use search_coins to find canonical coin slugs and list_event_categories to find category IDs.',
    'Display displayedDate to users. When isEstimated is true, date is a deadline or window end, not an exact event time.',
    'Pass meta.cursor into the next request with the same filters; stop when it is null.',
    'Plan limits apply: categories require Standard or higher, precise impact filters and sorting require Elite or higher, and history/future windows depend on the plan.'
  ],
  tags: { readOnly: true }
})
  .input(eventListInput)
  .output(eventPageSchema)
  .handleInvocation(async ctx => {
    const output = await new V2Client(ctx.auth.token).listEvents(ctx.input);
    return {
      output,
      message: `Retrieved ${output.data.length} events of ${output.meta.total} matching events.`
    };
  })
  .build();

export const getEvent = SlateTool.create(spec, {
  key: 'get_event',
  name: 'Get Event',
  description:
    'Retrieve a current CoinMarketCal V2 event by its ID from list_events. Available fields depend on the plan. A removed event returns 410; unknown or out-of-window events return 404.',
  instructions: [
    'Display displayedDate to users, especially when isEstimated is true. Requires a V2 API key.'
  ],
  tags: { readOnly: true }
})
  .input(z.object({ eventId: z.string().describe('String event ID returned by list_events') }))
  .output(eventV2Schema)
  .handleInvocation(async ctx => {
    const output = await new V2Client(ctx.auth.token).getEvent(ctx.input.eventId);
    return { output, message: `${output.title} — ${output.displayedDate}` };
  })
  .build();

export const searchCoins = SlateTool.create(spec, {
  key: 'search_coins',
  name: 'Search Coins',
  description:
    'Search or browse the CoinMarketCal V2 coin catalog to discover canonical coin slugs, editorial coverage, and upcoming event counts. Returns one page ordered by market-cap rank. Requires a V2 API key.',
  instructions: [
    'Use returned slugs with list_events and get_coin. Pass meta.cursor into the next request to retrieve more coins; null marks the last page.'
  ],
  tags: { readOnly: true }
})
  .input(coinListInput)
  .output(coinPageSchema)
  .handleInvocation(async ctx => {
    const output = await new V2Client(ctx.auth.token).listCoins(ctx.input);
    return {
      output,
      message: `Retrieved ${output.data.length} coins of ${output.meta.total} matching coins.`
    };
  })
  .build();

export const getCoin = SlateTool.create(spec, {
  key: 'get_coin',
  name: 'Get Coin',
  description:
    'Retrieve a CoinMarketCal V2 coin by its canonical slug from search_coins, including coverage and upcoming event counts. Requires a V2 API key.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      slug: z
        .string()
        .describe('Canonical lowercase coin slug from search_coins, such as bitcoin')
    })
  )
  .output(coinV2Schema)
  .handleInvocation(async ctx => {
    const output = await new V2Client(ctx.auth.token).getCoin(ctx.input.slug);
    return { output, message: `Retrieved ${output.name} (${output.symbol}).` };
  })
  .build();

export const listEventCategories = SlateTool.create(spec, {
  key: 'list_event_categories',
  name: 'List Event Categories',
  description:
    'List the CoinMarketCal V2 category taxonomy and upcoming event counts. Use the returned string IDs with list_events. Requires a V2 API key and Standard or higher plan.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(categoryListSchema)
  .handleInvocation(async ctx => {
    const output = await new V2Client(ctx.auth.token).listCategories();
    return { output, message: `Retrieved ${output.data.length} event categories.` };
  })
  .build();

export const getUsage = SlateTool.create(spec, {
  key: 'get_usage',
  name: 'Get API Usage',
  description:
    'Read the active plan, monthly request consumption, remaining quota, and reset time for the authenticated CoinMarketCal V2 API key. Requires a V2 API key.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(usageSchema)
  .handleInvocation(async ctx => {
    const output = await new V2Client(ctx.auth.token).getUsage();
    return { output, message: `Retrieved ${output.tier} plan usage for ${output.periodYm}.` };
  })
  .build();

export const listEventCancellations = SlateTool.create(spec, {
  key: 'list_event_cancellations',
  name: 'List Event Cancellations',
  description:
    'List permanently removed CoinMarketCal V2 events so a saved calendar can remove stale entries. Available on every V2 plan. Results are ordered by cancellation time and event ID.',
  instructions: [
    'Request at least once every 90 days; the provider retains recent cancellation records for 90 days. Follow meta.cursor until null. Requires a V2 API key.'
  ],
  tags: { readOnly: true }
})
  .input(cancellationListInput)
  .output(cancellationPageSchema)
  .handleInvocation(async ctx => {
    const output = await new V2Client(ctx.auth.token).listCancellations(ctx.input);
    return { output, message: `Retrieved ${output.data.length} event cancellations.` };
  })
  .build();

export const v2Tools = [
  listEvents,
  getEvent,
  searchCoins,
  getCoin,
  listEventCategories,
  getUsage,
  listEventCancellations
];
