import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, formatStatistics } from '../lib/client';
import { spec } from '../spec';

export let getLinkStatistics = SlateTool.create(spec, {
  name: 'Get Link Statistics',
  key: 'get_link_statistics',
  description: `Retrieve click statistics for a specific short link. Returns total clicks, human clicks, and breakdowns by browser, country, city, referrer, social platform, and operating system for a given time period.`,
  instructions: [
    'When using "custom" period, provide startDate and endDate as ISO dates or milliseconds since epoch. Use tz for the timezone name; tzOffset is a legacy option.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      linkId: z.string().describe('The link ID to get statistics for.'),
      period: z
        .enum([
          'today',
          'yesterday',
          'total',
          'week',
          'month',
          'lastmonth',
          'last7',
          'last30',
          'custom'
        ])
        .describe('Time period for statistics.'),
      tz: z
        .string()
        .optional()
        .describe(
          'Timezone name such as UTC or Europe/Berlin. Takes precedence over tzOffset.'
        ),
      tzOffset: z
        .number()
        .optional()
        .describe('Legacy timezone offset in minutes. Prefer tz with a timezone name.'),
      startDate: z
        .string()
        .optional()
        .describe(
          'Start ISO date or milliseconds since epoch. Required when period is "custom".'
        ),
      endDate: z
        .string()
        .optional()
        .describe(
          'End ISO date or milliseconds since epoch. Required when period is "custom".'
        )
    })
  )
  .output(
    z.object({
      totalClicks: z.number().describe('Total number of clicks.'),
      humanClicks: z.number().describe('Number of human (non-bot) clicks.'),
      humanClicksChange: z
        .number()
        .nullable()
        .describe('Change in human clicks compared to previous period.'),
      totalClicksChange: z
        .number()
        .nullable()
        .describe('Change in total clicks compared to previous period.'),
      browser: z.record(z.string(), z.number()).describe('Click breakdown by browser.'),
      country: z.record(z.string(), z.number()).describe('Click breakdown by country.'),
      city: z.record(z.string(), z.number()).describe('Click breakdown by city.'),
      referer: z.record(z.string(), z.number()).describe('Click breakdown by referrer.'),
      social: z.record(z.string(), z.number()).describe('Click breakdown by social platform.'),
      os: z.record(z.string(), z.number()).describe('Click breakdown by operating system.'),
      intervalStart: z
        .string()
        .describe(
          'Provider interval start. Empty only when the all-time response explicitly has null bounds.'
        ),
      intervalEnd: z
        .string()
        .describe(
          'Provider interval end. Empty only when the all-time response explicitly has null bounds.'
        ),
      raw: z
        .unknown()
        .describe(
          'Complete provider statistics, including chart datasets and original breakdown rows.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let stats = await client.getLinkStatistics(ctx.input.linkId, {
      period: ctx.input.period,
      tzOffset: ctx.input.tzOffset,
      tz: ctx.input.tz,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate
    });

    let output = formatStatistics(stats, ctx.input.period, 'link');
    return {
      output,
      message: `Link statistics for period **${ctx.input.period}**: **${output.totalClicks}** total clicks, **${output.humanClicks}** human clicks`
    };
  })
  .build();
