import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSystemInfo = SlateTool.create(spec, {
  name: 'Get System Info',
  key: 'get_system_info',
  description: `Retrieve account or project information including user ID, email, accounting period details, and email counters. Useful for checking account status and usage.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.number().describe('UniOne user ID'),
      email: z.string().describe('Account email address'),
      accountingPeriodStart: z
        .string()
        .optional()
        .describe('Start of current accounting period'),
      accountingPeriodEnd: z.string().optional().describe('End of current accounting period'),
      emailsIncluded: z
        .number()
        .optional()
        .describe('Number of emails included in the current plan'),
      emailsSent: z
        .number()
        .optional()
        .describe('Number of emails sent in the current period'),
      projectId: z.string().optional().describe('Project ID (if using project API key)'),
      projectName: z.string().optional().describe('Project name (if using project API key)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      datacenter: ctx.config.datacenter
    });

    let result = await client.getSystemInfo();

    return {
      output: {
        userId: result.user_id,
        email: result.email,
        accountingPeriodStart: result.accounting_period_start,
        accountingPeriodEnd: result.accounting_period_end,
        emailsIncluded: result.emails_included,
        emailsSent: result.emails_sent,
        projectId: result.project_id,
        projectName: result.project_name
      },
      message: `Account: **${result.email}** (User ID: ${result.user_id}).${result.emails_sent !== undefined ? ` Emails sent: ${result.emails_sent}/${result.emails_included ?? 'unlimited'}.` : ''}`
    };
  })
  .build();
