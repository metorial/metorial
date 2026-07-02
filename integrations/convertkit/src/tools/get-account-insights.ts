import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

export let getAccountInsights = SlateTool.create(spec, {
  name: 'Get Account Insights',
  key: 'get_account_insights',
  description:
    'Retrieve Kit creator profile details, account-wide email stats, or subscriber growth stats.',
  instructions: [
    'Use insight "creator_profile" to retrieve public creator profile details.',
    'Use insight "email_stats" to retrieve last-90-day account email engagement stats.',
    'Use insight "growth_stats" to retrieve subscriber growth stats. Optionally provide starting and ending as YYYY-MM-DD dates.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      insight: z
        .enum(['creator_profile', 'email_stats', 'growth_stats'])
        .describe('Account insight to retrieve'),
      starting: z
        .string()
        .optional()
        .describe('For growth_stats, period start date in YYYY-MM-DD format'),
      ending: z
        .string()
        .optional()
        .describe('For growth_stats, period end date in YYYY-MM-DD format')
    })
  )
  .output(
    z.object({
      profile: z
        .object({
          name: z.string(),
          byline: z.string(),
          bio: z.string(),
          imageUrl: z.string(),
          profileUrl: z.string()
        })
        .optional()
        .describe('Creator profile details'),
      emailStats: z
        .object({
          sent: z.number(),
          clicked: z.number(),
          opened: z.number(),
          emailStatsMode: z.string(),
          openTrackingEnabled: z.boolean(),
          clickTrackingEnabled: z.boolean(),
          starting: z.string(),
          ending: z.string(),
          openRate: z.number().optional(),
          clickRate: z.number().optional(),
          unsubscribeRate: z.number().optional(),
          bounceRate: z.number().optional()
        })
        .optional()
        .describe('Account email engagement stats'),
      growthStats: z
        .object({
          cancellations: z.number(),
          netNewSubscribers: z.number(),
          newSubscribers: z.number(),
          subscribers: z.number(),
          starting: z.string(),
          ending: z.string()
        })
        .optional()
        .describe('Subscriber growth stats')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);

    if (ctx.input.insight === 'creator_profile') {
      let profile = await client.getCreatorProfile();
      return {
        output: {
          profile: {
            name: profile.name,
            byline: profile.byline,
            bio: profile.bio,
            imageUrl: profile.image_url,
            profileUrl: profile.profile_url
          }
        },
        message: `Creator profile **${profile.name}**`
      };
    }

    if (ctx.input.insight === 'email_stats') {
      let stats = await client.getEmailStats();
      return {
        output: {
          emailStats: {
            sent: stats.sent,
            clicked: stats.clicked,
            opened: stats.opened,
            emailStatsMode: stats.email_stats_mode,
            openTrackingEnabled: stats.open_tracking_enabled,
            clickTrackingEnabled: stats.click_tracking_enabled,
            starting: stats.starting,
            ending: stats.ending,
            openRate: stats.open_rate,
            clickRate: stats.click_rate,
            unsubscribeRate: stats.unsubscribe_rate,
            bounceRate: stats.bounce_rate
          }
        },
        message: `Retrieved email stats for ${stats.starting} through ${stats.ending}.`
      };
    }

    let stats = await client.getGrowthStats({
      starting: ctx.input.starting,
      ending: ctx.input.ending
    });
    return {
      output: {
        growthStats: {
          cancellations: stats.cancellations,
          netNewSubscribers: stats.net_new_subscribers,
          newSubscribers: stats.new_subscribers,
          subscribers: stats.subscribers,
          starting: stats.starting,
          ending: stats.ending
        }
      },
      message: `Retrieved growth stats for ${stats.starting} through ${stats.ending}.`
    };
  });
