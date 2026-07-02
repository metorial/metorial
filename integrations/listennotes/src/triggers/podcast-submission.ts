import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let podcastSubmission = SlateTrigger.create(spec, {
  name: 'Podcast Submission Events',
  key: 'podcast_submission',
  description:
    'Triggered when a podcast submission is accepted, rejected, or when a podcast is deleted. Configure the webhook URL in the Listen Notes API Dashboard under the "WEBHOOKS" tab.'
})
  .input(
    z.object({
      eventType: z
        .enum(['submit_accepted', 'submit_rejected', 'deleted'])
        .describe('Type of podcast event.'),
      podcastId: z
        .string()
        .optional()
        .describe('Listen Notes podcast ID (for accepted/deleted events).'),
      title: z.string().optional().describe('Podcast title (for accepted/deleted events).'),
      rss: z.string().optional().describe('RSS feed URL.'),
      rawPayload: z.any().describe('Raw webhook payload.')
    })
  )
  .output(
    z.object({
      podcastId: z.string().optional().describe('Listen Notes podcast ID.'),
      title: z.string().optional().describe('Podcast title.'),
      rss: z.string().optional().describe('RSS feed URL.'),
      image: z.string().optional().describe('Podcast image URL.'),
      listennotesUrl: z.string().optional().describe('Listen Notes URL.')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      // Determine event type from the URL path or payload structure
      let url = new URL(ctx.request.url);
      let pathParts = url.pathname.split('/').filter(Boolean);
      let lastSegment = pathParts[pathParts.length - 1] || '';

      let eventType: 'submit_accepted' | 'submit_rejected' | 'deleted';

      if (lastSegment === 'deleted' || data?.status === 'deleted') {
        eventType = 'deleted';
      } else if (data?.podcast?.rss && !data?.podcast?.id) {
        eventType = 'submit_rejected';
      } else {
        eventType = 'submit_accepted';
      }

      let podcast = data?.podcast || data;

      return {
        inputs: [
          {
            eventType,
            podcastId: podcast?.id || podcast?.podcast_id || undefined,
            title: podcast?.title || undefined,
            rss: podcast?.rss || undefined,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let input = ctx.input;
      let podcast = input.rawPayload?.podcast || input.rawPayload;

      return {
        type: `podcast.${input.eventType}`,
        id: `${input.eventType}_${input.podcastId || input.rss || Date.now()}`,
        output: {
          podcastId: input.podcastId || podcast?.id || undefined,
          title: input.title || podcast?.title || undefined,
          rss: input.rss || podcast?.rss || undefined,
          image: podcast?.image || undefined,
          listennotesUrl: podcast?.listennotes_url || undefined
        }
      };
    }
  })
  .build();
