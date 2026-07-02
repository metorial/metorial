import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageScheduler = SlateTool.create(spec, {
  name: 'Manage Scheduler',
  key: 'manage_scheduler',
  description: `Enable, disable, or retrieve the cron-based scheduler for a sitemap. When enabled, scraping jobs run automatically at specified intervals. Use action "get" to view current settings, "enable" to configure and activate, or "disable" to turn off.`,
  instructions: [
    'Cron fields follow standard cron syntax: minute (0-59), hour (0-23), day (1-31), month (1-12), weekday (0-6, 0=Sunday).',
    'Use "*" for "every" and "*/N" for "every N" intervals.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['get', 'enable', 'disable'])
        .describe('Action to perform on the scheduler'),
      sitemapId: z.number().describe('ID of the sitemap'),
      cronMinute: z
        .string()
        .optional()
        .describe('Cron minute expression (required when enabling)'),
      cronHour: z
        .string()
        .optional()
        .describe('Cron hour expression (required when enabling)'),
      cronDay: z
        .string()
        .optional()
        .describe('Cron day-of-month expression (required when enabling)'),
      cronMonth: z
        .string()
        .optional()
        .describe('Cron month expression (required when enabling)'),
      cronWeekday: z
        .string()
        .optional()
        .describe('Cron day-of-week expression (required when enabling)'),
      cronTimezone: z.string().optional().describe('Timezone string, e.g. "America/New_York"'),
      driver: z
        .enum(['fast', 'fulljs'])
        .optional()
        .describe('Scraping driver for scheduled jobs'),
      proxy: z.string().optional().describe('Proxy for scheduled jobs'),
      requestInterval: z
        .number()
        .optional()
        .describe('Delay between requests in milliseconds'),
      pageLoadDelay: z.number().optional().describe('Page load delay in milliseconds')
    })
  )
  .output(
    z.object({
      schedulerEnabled: z.boolean().describe('Whether the scheduler is currently enabled'),
      cronMinute: z.string().optional().describe('Cron minute expression'),
      cronHour: z.string().optional().describe('Cron hour expression'),
      cronDay: z.string().optional().describe('Cron day expression'),
      cronMonth: z.string().optional().describe('Cron month expression'),
      cronWeekday: z.string().optional().describe('Cron weekday expression'),
      cronTimezone: z.string().optional().describe('Timezone'),
      driver: z.string().optional().describe('Scraping driver'),
      proxy: z.string().optional().describe('Proxy setting'),
      requestInterval: z.number().optional().describe('Request interval in milliseconds'),
      pageLoadDelay: z.number().optional().describe('Page load delay in milliseconds')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    if (ctx.input.action === 'disable') {
      await client.disableScheduler(ctx.input.sitemapId);
      return {
        output: { schedulerEnabled: false },
        message: `Disabled scheduler for sitemap \`${ctx.input.sitemapId}\`.`
      };
    }

    if (ctx.input.action === 'enable') {
      if (
        !ctx.input.cronMinute ||
        !ctx.input.cronHour ||
        !ctx.input.cronDay ||
        !ctx.input.cronMonth ||
        !ctx.input.cronWeekday
      ) {
        throw new Error(
          'All cron fields (cronMinute, cronHour, cronDay, cronMonth, cronWeekday) are required when enabling the scheduler.'
        );
      }

      await client.enableScheduler(ctx.input.sitemapId, {
        cronMinute: ctx.input.cronMinute,
        cronHour: ctx.input.cronHour,
        cronDay: ctx.input.cronDay,
        cronMonth: ctx.input.cronMonth,
        cronWeekday: ctx.input.cronWeekday,
        cronTimezone: ctx.input.cronTimezone,
        driver: ctx.input.driver,
        proxy: ctx.input.proxy,
        requestInterval: ctx.input.requestInterval,
        pageLoadDelay: ctx.input.pageLoadDelay
      });

      // Fetch the updated scheduler state
      let scheduler = await client.getScheduler(ctx.input.sitemapId);

      return {
        output: {
          schedulerEnabled: true,
          cronMinute: scheduler.cron_minute,
          cronHour: scheduler.cron_hour,
          cronDay: scheduler.cron_day,
          cronMonth: scheduler.cron_month,
          cronWeekday: scheduler.cron_weekday,
          cronTimezone: scheduler.cron_timezone,
          driver: scheduler.driver,
          proxy: scheduler.proxy,
          requestInterval: scheduler.request_interval,
          pageLoadDelay: scheduler.page_load_delay
        },
        message: `Enabled scheduler for sitemap \`${ctx.input.sitemapId}\` with cron: \`${ctx.input.cronMinute} ${ctx.input.cronHour} ${ctx.input.cronDay} ${ctx.input.cronMonth} ${ctx.input.cronWeekday}\`.`
      };
    }

    // action === 'get'
    let scheduler = await client.getScheduler(ctx.input.sitemapId);

    return {
      output: {
        schedulerEnabled: scheduler.scheduler_enabled,
        cronMinute: scheduler.cron_minute,
        cronHour: scheduler.cron_hour,
        cronDay: scheduler.cron_day,
        cronMonth: scheduler.cron_month,
        cronWeekday: scheduler.cron_weekday,
        cronTimezone: scheduler.cron_timezone,
        driver: scheduler.driver,
        proxy: scheduler.proxy,
        requestInterval: scheduler.request_interval,
        pageLoadDelay: scheduler.page_load_delay
      },
      message: `Scheduler for sitemap \`${ctx.input.sitemapId}\` is **${scheduler.scheduler_enabled ? 'enabled' : 'disabled'}**.`
    };
  })
  .build();
