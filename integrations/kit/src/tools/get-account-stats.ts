import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccountStats = SlateTool.create(spec, {
  name: 'Get Account Stats',
  key: 'get_account_stats',
  description: `Retrieve account-level email engagement stats or subscriber growth stats from Kit.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      statsType: z.enum(['email', 'growth']).describe('Which account stats endpoint to call'),
      starting: z.string().optional().describe('Growth stats start date in yyyy-mm-dd format'),
      ending: z.string().optional().describe('Growth stats end date in yyyy-mm-dd format')
    })
  )
  .output(
    z.object({
      statsType: z.string().describe('Stats type returned'),
      sent: z.number().optional().describe('Emails sent'),
      opened: z.number().optional().describe('Emails opened'),
      clicked: z.number().optional().describe('Emails clicked'),
      emailStatsMode: z.string().optional().describe('Email stats window'),
      openTrackingEnabled: z.boolean().optional().describe('Whether open tracking is enabled'),
      clickTrackingEnabled: z
        .boolean()
        .optional()
        .describe('Whether click tracking is enabled'),
      cancellations: z.number().optional().describe('Subscriber cancellations'),
      netNewSubscribers: z.number().optional().describe('Net new subscribers'),
      newSubscribers: z.number().optional().describe('New subscribers'),
      subscribers: z.number().optional().describe('Subscriber total'),
      starting: z.string().describe('Stats window start'),
      ending: z.string().describe('Stats window end')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.statsType === 'email') {
      let data = await client.getEmailStats();
      return {
        output: {
          statsType: 'email',
          sent: data.stats.sent,
          opened: data.stats.opened,
          clicked: data.stats.clicked,
          emailStatsMode: data.stats.email_stats_mode,
          openTrackingEnabled: data.stats.open_tracking_enabled,
          clickTrackingEnabled: data.stats.click_tracking_enabled,
          starting: data.stats.starting,
          ending: data.stats.ending
        },
        message: `Email stats: ${data.stats.sent} sent, ${data.stats.opened} opened, ${data.stats.clicked} clicked.`
      };
    }

    let data = await client.getGrowthStats({
      starting: ctx.input.starting,
      ending: ctx.input.ending
    });

    return {
      output: {
        statsType: 'growth',
        cancellations: data.stats.cancellations,
        netNewSubscribers: data.stats.net_new_subscribers,
        newSubscribers: data.stats.new_subscribers,
        subscribers: data.stats.subscribers,
        starting: data.stats.starting,
        ending: data.stats.ending
      },
      message: `Growth stats: ${data.stats.net_new_subscribers} net new subscribers.`
    };
  })
  .build();
