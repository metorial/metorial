import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getDomainStatistics = SlateTool.create(spec, {
  name: 'Get Domain Statistics',
  key: 'get_domain_statistics',
  description: `Retrieve aggregate click statistics for an entire domain. Returns total clicks, human clicks, and breakdowns by browser, country, city, referrer, social platform, and operating system for a given time period.`,
  instructions: [
    'When using "custom" period, startDate and endDate are required in milliseconds since epoch.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domainId: z
        .number()
        .optional()
        .describe('Domain ID to get statistics for. Falls back to config default.'),
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
      tzOffset: z
        .number()
        .optional()
        .describe('Timezone offset (e.g., 0 for UTC, -5 for EST). Defaults to 0.'),
      startDate: z
        .string()
        .optional()
        .describe('Start date in milliseconds from epoch. Required when period is "custom".'),
      endDate: z
        .string()
        .optional()
        .describe('End date in milliseconds from epoch. Required when period is "custom".')
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
      intervalStart: z.string().describe('Start of the statistics interval.'),
      intervalEnd: z.string().describe('End of the statistics interval.')
    })
  )
  .handleInvocation(async ctx => {
    let domainId = ctx.input.domainId || ctx.config.domainId;
    if (!domainId) {
      throw new Error(
        'Domain ID is required. Provide it in the input or set a default in config.'
      );
    }

    let client = new Client({ token: ctx.auth.token });

    let stats = await client.getDomainStatistics(domainId, {
      period: ctx.input.period,
      tzOffset: ctx.input.tzOffset,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate
    });

    return {
      output: {
        totalClicks: stats.totalClicks,
        humanClicks: stats.humanClicks,
        humanClicksChange: stats.humanClicksChange,
        totalClicksChange: stats.totalClicksChange,
        browser: stats.browser,
        country: stats.country,
        city: stats.city,
        referer: stats.referer,
        social: stats.social,
        os: stats.os,
        intervalStart: stats.interval.startDate,
        intervalEnd: stats.interval.endDate
      },
      message: `Domain statistics for period **${ctx.input.period}**: **${stats.totalClicks}** total clicks, **${stats.humanClicks}** human clicks`
    };
  })
  .build();
