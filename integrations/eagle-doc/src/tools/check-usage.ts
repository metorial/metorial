import { SlateTool } from 'slates';
import { z } from 'zod';
import { EagleDocClient } from '../lib/client';
import { spec } from '../spec';

export let checkUsage = SlateTool.create(spec, {
  name: 'Check Usage',
  key: 'check_usage',
  description: `Monitor your Eagle Doc API usage and quota. Retrieve current month usage, historical monthly usage, request logs, and management quota information.`,
  instructions: [
    'Use usageType "current" for live consumption counters of the current billing month.',
    'Use "monthly" for historical monthly aggregated usage.',
    'Use "logs" for a chronological list of recent API calls.',
    'Use "quota" for contractual allowance and usage counters.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      usageType: z
        .enum(['current', 'monthly', 'logs', 'quota'])
        .describe('Type of usage data to retrieve')
    })
  )
  .output(
    z.object({
      usageType: z.string().describe('Type of usage data returned'),
      currentUsage: z
        .object({
          currentMonth: z.string().optional(),
          contractQuota: z.number().optional(),
          quotaUsed: z.number().optional(),
          overUsageAllowed: z.boolean().optional(),
          hardLimit: z.number().nullable().optional(),
          overUsage: z.number().optional(),
          pricePerPageOverUsage: z.number().optional(),
          overUsageCost: z.number().optional()
        })
        .optional()
        .describe('Current month usage (when usageType is "current")'),
      monthlyUsage: z
        .array(
          z
            .object({
              quotaUsed: z.number().optional(),
              quotaDate: z.string().optional(),
              additionalInfo: z.record(z.string(), z.any()).optional()
            })
            .passthrough()
        )
        .optional()
        .describe('Monthly usage history (when usageType is "monthly")'),
      requestLogs: z
        .array(
          z
            .object({
              pages: z.number().optional(),
              time: z.string().optional(),
              timeRequested: z.string().optional()
            })
            .passthrough()
        )
        .optional()
        .describe('Recent API call logs (when usageType is "logs")'),
      managementQuota: z
        .object({
          quota: z.number().optional(),
          quotaUsed: z.number().optional(),
          currentMonth: z.string().optional()
        })
        .optional()
        .describe('Management quota info (when usageType is "quota")')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EagleDocClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let output: any = { usageType: ctx.input.usageType };
    let message = '';

    switch (ctx.input.usageType) {
      case 'current': {
        let data = await client.getCurrentUsage();
        output.currentUsage = data;
        message = `Current month (**${data.currentMonth}**): ${data.quotaUsed}/${data.contractQuota} pages used.`;
        if (data.overUsage > 0)
          message += ` Over-usage: ${data.overUsage} pages ($${data.overUsageCost}).`;
        break;
      }
      case 'monthly': {
        let data = await client.getMonthlyUsage();
        output.monthlyUsage = data;
        message = `Retrieved **${data.length}** month(s) of usage history.`;
        break;
      }
      case 'logs': {
        let data = await client.getRequestLogs();
        output.requestLogs = data;
        message = `Retrieved **${data.length}** recent API call log(s).`;
        break;
      }
      case 'quota': {
        let data = await client.getManagementQuota();
        output.managementQuota = data;
        message = `Quota: ${data.quotaUsed}/${data.quota} pages used for **${data.currentMonth}**.`;
        break;
      }
    }

    return { output, message };
  })
  .build();
