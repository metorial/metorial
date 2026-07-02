import { SlateTool } from 'slates';
import { z } from 'zod';
import { CuttlyClient } from '../lib/client';
import { spec } from '../spec';

let deviceEntrySchema = z.object({
  tag: z.string().describe('Category label (e.g. country code, device type, browser name)'),
  clicks: z.number().describe('Number of clicks from this category')
});

let referrerEntrySchema = z.object({
  link: z.string().describe('Referring domain'),
  clicks: z.number().describe('Number of clicks from this referrer')
});

let botEntrySchema = z.object({
  name: z.string().describe('Bot identifier'),
  clicks: z.number().describe('Number of clicks from this bot')
});

export let getLinkAnalytics = SlateTool.create(spec, {
  name: 'Get Link Analytics',
  key: 'get_link_analytics',
  description: `Retrieve click analytics for a Cutt.ly shortened URL. Returns total clicks, social media breakdowns (Facebook, Twitter, LinkedIn), referrer domains, and device-level data including geography, device type, OS, browser, brand, and language. Supports optional date range filtering on Team plans.`,
  constraints: [
    'Date range filtering (dateFrom/dateTo) requires a Team subscription plan.',
    'You can only retrieve analytics for links you own.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      shortLink: z.string().describe('The shortened URL to get analytics for'),
      dateFrom: z
        .string()
        .optional()
        .describe('Start date for filtering clicks (YYYY-MM-DD). Requires Team plan.'),
      dateTo: z
        .string()
        .optional()
        .describe('End date for filtering clicks (YYYY-MM-DD). Requires Team plan.')
    })
  )
  .output(
    z.object({
      shortLink: z.string().describe('The shortened URL'),
      fullLink: z.string().describe('The original destination URL'),
      title: z.string().describe('Title of the shortened link'),
      createdAt: z.string().describe('Date when the link was created'),
      totalClicks: z.number().describe('Total number of clicks'),
      facebookClicks: z.number().describe('Clicks from Facebook'),
      twitterClicks: z.number().describe('Clicks from Twitter'),
      linkedinClicks: z.number().describe('Clicks from LinkedIn'),
      otherClicks: z.number().describe('Clicks from other sources'),
      botClicks: z.number().describe('Clicks identified as bot traffic'),
      referrers: z.array(referrerEntrySchema).describe('Click counts by referring domain'),
      geography: z.array(deviceEntrySchema).describe('Click counts by country'),
      devices: z.array(deviceEntrySchema).describe('Click counts by device type'),
      operatingSystems: z
        .array(deviceEntrySchema)
        .describe('Click counts by operating system'),
      browsers: z.array(deviceEntrySchema).describe('Click counts by browser'),
      brands: z.array(deviceEntrySchema).describe('Click counts by device brand'),
      languages: z.array(deviceEntrySchema).describe('Click counts by language'),
      botDetails: z.array(botEntrySchema).describe('Detailed breakdown of bot clicks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CuttlyClient({
      apiKey: ctx.auth.token,
      apiType: ctx.config.apiType
    });

    let stats = await client.getStats({
      shortLink: ctx.input.shortLink,
      dateFrom: ctx.input.dateFrom,
      dateTo: ctx.input.dateTo
    });

    if (stats.status !== 1) {
      throw new Error(
        `Failed to retrieve analytics. The link may not exist or you may not own it.`
      );
    }

    return {
      output: {
        shortLink: stats.shortLink,
        fullLink: stats.fullLink,
        title: stats.title,
        createdAt: stats.date,
        totalClicks: stats.clicks,
        facebookClicks: stats.facebook,
        twitterClicks: stats.twitter,
        linkedinClicks: stats.linkedin,
        otherClicks: stats.rest,
        botClicks: stats.botClicks,
        referrers: stats.referrers,
        geography: stats.geography,
        devices: stats.devices,
        operatingSystems: stats.operatingSystems,
        browsers: stats.browsers,
        brands: stats.brands,
        languages: stats.languages,
        botDetails: stats.botDetails
      },
      message: `Analytics for **${stats.shortLink}**: **${stats.clicks}** total clicks`
    };
  })
  .build();
