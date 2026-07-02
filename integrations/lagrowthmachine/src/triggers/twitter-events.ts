import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let twitterEventTypes = z.enum([
  'twitter.tweet_sent',
  'twitter.dm_sent',
  'twitter.tweet_favorited',
  'twitter.tweet_retweeted',
  'twitter.followed',
  'twitter.unfollowed'
]);

export let twitterEvents = SlateTrigger.create(spec, {
  name: 'Twitter/X Events',
  key: 'twitter_events',
  description:
    'Triggers when Twitter/X-related events occur in La Growth Machine, including tweets sent, DMs sent, tweet interactions (favorites, retweets), and follow/unfollow actions.'
})
  .input(
    z.object({
      eventType: twitterEventTypes.describe('Type of Twitter/X event'),
      eventId: z.string().describe('Unique event identifier'),
      leadId: z.string().optional().describe('ID of the affected lead'),
      campaignId: z.string().optional().describe('ID of the associated campaign'),
      firstname: z.string().optional().describe('First name of the lead'),
      lastname: z.string().optional().describe('Last name of the lead'),
      twitterHandle: z.string().optional().describe('Twitter/X handle of the lead'),
      timestamp: z.string().optional().describe('Timestamp of the event'),
      payload: z.any().optional().describe('Full event payload from LGM')
    })
  )
  .output(
    z.object({
      leadId: z.string().optional().describe('ID of the affected lead'),
      campaignId: z.string().optional().describe('ID of the associated campaign'),
      firstname: z.string().optional().describe('First name of the lead'),
      lastname: z.string().optional().describe('Last name of the lead'),
      twitterHandle: z.string().optional().describe('Twitter/X handle of the lead'),
      timestamp: z.string().optional().describe('Timestamp when the event occurred')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let events = Array.isArray(data) ? data : [data];

      let inputs = events.map((event: any) => {
        let eventType = mapTwitterEventType(event.type || event.eventType || event.event);
        let eventId =
          event.id || event.eventId || `${eventType}-${event.leadId || ''}-${Date.now()}`;

        return {
          eventType: eventType as z.infer<typeof twitterEventTypes>,
          eventId: String(eventId),
          leadId: event.leadId ? String(event.leadId) : undefined,
          campaignId: event.campaignId ? String(event.campaignId) : undefined,
          firstname: event.firstname || event.firstName,
          lastname: event.lastname || event.lastName,
          twitterHandle: event.twitter || event.twitterHandle,
          timestamp: event.timestamp || event.createdAt || event.date,
          payload: event
        };
      });

      return { inputs };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          leadId: ctx.input.leadId,
          campaignId: ctx.input.campaignId,
          firstname: ctx.input.firstname,
          lastname: ctx.input.lastname,
          twitterHandle: ctx.input.twitterHandle,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();

let mapTwitterEventType = (type: string | undefined): string => {
  if (!type) return 'twitter.tweet_sent';
  let normalized = type.toLowerCase().replace(/[\s]/g, '_');
  if (normalized.includes('dm') || normalized.includes('direct_message'))
    return 'twitter.dm_sent';
  if (normalized.includes('favorite') || normalized.includes('like'))
    return 'twitter.tweet_favorited';
  if (normalized.includes('retweet')) return 'twitter.tweet_retweeted';
  if (normalized.includes('unfollow')) return 'twitter.unfollowed';
  if (normalized.includes('follow')) return 'twitter.followed';
  if (normalized.includes('tweet') && normalized.includes('sent')) return 'twitter.tweet_sent';
  if (normalized.includes('tweet')) return 'twitter.tweet_sent';
  return 'twitter.tweet_sent';
};
