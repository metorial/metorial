import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let crawlerEvent = SlateTrigger.create(spec, {
  name: 'Crawler Event',
  key: 'crawler_event',
  description:
    'Triggered by crawler webhook events including page visits and crawl completion. Receives real-time callbacks as the crawler progresses.'
})
  .input(
    z.object({
      eventName: z
        .string()
        .describe('Crawler event name (crawler_url_visited or crawler_finished).'),
      crawlUuid: z.string().optional().describe('UUID of the crawl job.'),
      url: z.string().optional().describe('URL that was visited (for url_visited events).'),
      statusCode: z.number().optional().describe('HTTP status code (for url_visited events).'),
      depth: z
        .number()
        .optional()
        .describe('Link depth from starting URL (for url_visited events).'),
      eventId: z.string().describe('Unique event identifier.'),
      rawPayload: z.any().describe('Full raw webhook payload.')
    })
  )
  .output(
    z.object({
      crawlUuid: z.string().optional().describe('UUID of the crawl job.'),
      eventName: z.string().describe('Type of crawler event.'),
      url: z.string().optional().describe('URL visited (for url_visited events).'),
      statusCode: z.number().optional().describe('HTTP status code of the visited URL.'),
      depth: z.number().optional().describe('Link depth from starting URL.'),
      state: z
        .any()
        .optional()
        .describe('Crawl state information (for crawler_finished events).')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data: any = await ctx.request.json();

      let eventName = ctx.request.headers.get('x-scrapfly-crawl-event-name') ?? '';

      if (!eventName) {
        return { inputs: [] };
      }

      let crawlUuid = data?.uuid ?? data?.crawl_uuid;

      return {
        inputs: [
          {
            eventName,
            crawlUuid,
            url: data?.url,
            statusCode: data?.status_code,
            depth: data?.depth,
            eventId: `${crawlUuid}-${eventName}-${data?.url ?? ''}-${Date.now()}`,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `crawler.${ctx.input.eventName}`,
        id: ctx.input.eventId,
        output: {
          crawlUuid: ctx.input.crawlUuid,
          eventName: ctx.input.eventName,
          url: ctx.input.url,
          statusCode: ctx.input.statusCode,
          depth: ctx.input.depth,
          state: ctx.input.rawPayload?.state
        }
      };
    }
  })
  .build();
