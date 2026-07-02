import { SlateTool } from 'slates';
import { z } from 'zod';
import { MailtrapClient } from '../lib/client';
import { spec } from '../spec';

export let getEmailStats = SlateTool.create(spec, {
  name: 'Get Email Stats',
  key: 'get_email_stats',
  description: `Retrieve delivery statistics for your sent emails over a date range. Includes metrics like delivery count/rate, open count/rate, click count/rate, bounce count/rate, and spam complaint count/rate. Can optionally group results by date, domain, category, or email service provider.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      startDate: z.string().describe('Start date (YYYY-MM-DD)'),
      endDate: z.string().describe('End date (YYYY-MM-DD)'),
      sendingDomainIds: z
        .array(z.number())
        .optional()
        .describe('Filter by specific sending domain IDs'),
      sendingStreams: z
        .array(z.enum(['transactional', 'bulk']))
        .optional()
        .describe('Filter by sending stream type'),
      categories: z.array(z.string()).optional().describe('Filter by email categories'),
      groupBy: z
        .enum(['date', 'domains', 'categories', 'email_service_providers'])
        .optional()
        .describe('Group results by a dimension')
    })
  )
  .output(
    z.object({
      stats: z
        .any()
        .describe(
          'Email delivery statistics. When groupBy is set, returns array of grouped stats; otherwise returns aggregate stats with delivery, open, click, bounce, and spam metrics.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailtrapClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let result = await client.getStats({
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      sendingDomainIds: ctx.input.sendingDomainIds,
      sendingStreams: ctx.input.sendingStreams,
      categories: ctx.input.categories,
      groupBy: ctx.input.groupBy
    });

    return {
      output: { stats: result },
      message: `Retrieved email stats from **${ctx.input.startDate}** to **${ctx.input.endDate}**${ctx.input.groupBy ? ` grouped by ${ctx.input.groupBy}` : ''}.`
    };
  })
  .build();
