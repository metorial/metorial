import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let scraperWebhook = SlateTrigger.create(spec, {
  name: 'LinkedIn Scraper Event',
  key: 'scraper_event',
  description:
    'Triggers when a LinkedIn scraper completes or encounters an error. The webhook fires with FINISHED or ERROR events.'
})
  .input(
    z.object({
      scraperName: z.string().describe('Name of the scraper'),
      scraperId: z.string().describe('ID of the scraper'),
      eventType: z.string().describe('Event type: FINISHED or ERROR'),
      errorMessage: z.string().optional().describe('Error details if event is ERROR'),
      rawPayload: z.record(z.string(), z.unknown()).describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      scraperId: z.string().describe('ID of the scraper'),
      scraperName: z.string().describe('Name of the scraper'),
      eventType: z.string().describe('Event type: FINISHED or ERROR'),
      errorMessage: z.string().optional().describe('Error details if applicable')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      // Scraper webhooks are per-scraper, so we can't auto-register globally.
      // The user would manage scraper webhooks via the manage_linkedin_scraper tool.
      // We just return registration details for tracking.
      return {
        registrationDetails: {
          webhookUrl: ctx.input.webhookBaseUrl
        }
      };
    },

    autoUnregisterWebhook: async _ctx => {
      // Scraper webhooks are managed per-scraper; cleanup handled externally
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;

      let scraperName = (data.name || data.scraperName || '') as string;
      let scraperId = (data.id || data.scraperId || data._id || '') as string;
      let eventType = (data.event || data.type || data.eventType || 'UNKNOWN') as string;
      let errorMessage = (data.error || data.errorMessage || data.message) as
        | string
        | undefined;

      return {
        inputs: [
          {
            scraperName,
            scraperId,
            eventType,
            errorMessage,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { scraperName, scraperId, eventType, errorMessage } = ctx.input;

      return {
        type: `scraper.${eventType.toLowerCase()}`,
        id: `${scraperId}-${eventType}-${Date.now()}`,
        output: {
          scraperId,
          scraperName,
          eventType,
          errorMessage
        }
      };
    }
  })
  .build();
