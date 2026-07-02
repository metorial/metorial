import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccountInfo = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account_info',
  description: `Retrieves the current credit balance and optionally API usage statistics for a date range.
Returns the number of remaining validation credits and, when dates are provided, a breakdown of validations performed by status and sub-status.`,
  instructions: [
    'To get only the credit balance, omit startDate and endDate.',
    'To include usage statistics, provide both startDate and endDate in yyyy-mm-dd format.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      startDate: z
        .string()
        .optional()
        .describe('Start date for usage statistics in yyyy-mm-dd format'),
      endDate: z
        .string()
        .optional()
        .describe('End date for usage statistics in yyyy-mm-dd format')
    })
  )
  .output(
    z.object({
      credits: z
        .number()
        .describe('Remaining validation credits. -1 indicates an invalid API key.'),
      usage: z
        .object({
          total: z.number().describe('Total API calls in the date range'),
          startDate: z.string().describe('Start date of the query period'),
          endDate: z.string().describe('End date of the query period'),
          statusValid: z.number().describe('Number of valid emails'),
          statusInvalid: z.number().describe('Number of invalid emails'),
          statusCatchAll: z.number().describe('Number of catch-all emails'),
          statusDoNotMail: z.number().describe('Number of do-not-mail emails'),
          statusSpamtrap: z.number().describe('Number of spamtrap emails'),
          statusUnknown: z.number().describe('Number of unknown emails')
        })
        .optional()
        .describe('Usage statistics for the specified date range')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    ctx.info('Fetching account credits');
    let creditsResult = await client.getCredits();
    let credits = Number(creditsResult.Credits);

    let usage:
      | {
          total: number;
          startDate: string;
          endDate: string;
          statusValid: number;
          statusInvalid: number;
          statusCatchAll: number;
          statusDoNotMail: number;
          statusSpamtrap: number;
          statusUnknown: number;
        }
      | undefined;

    if (ctx.input.startDate && ctx.input.endDate) {
      ctx.info(`Fetching API usage from ${ctx.input.startDate} to ${ctx.input.endDate}`);
      let usageResult = await client.getApiUsage(ctx.input.startDate, ctx.input.endDate);

      usage = {
        total: Number(usageResult.total || 0),
        startDate: String(usageResult.start_date || ctx.input.startDate),
        endDate: String(usageResult.end_date || ctx.input.endDate),
        statusValid: Number(usageResult.status_valid || 0),
        statusInvalid: Number(usageResult.status_invalid || 0),
        statusCatchAll: Number(usageResult.status_catch_all || 0),
        statusDoNotMail: Number(usageResult.status_do_not_mail || 0),
        statusSpamtrap: Number(usageResult.status_spamtrap || 0),
        statusUnknown: Number(usageResult.status_unknown || 0)
      };
    }

    let message = `Account has **${credits.toLocaleString()}** credits remaining.`;
    if (usage) {
      message += ` Usage from ${usage.startDate} to ${usage.endDate}: **${usage.total}** total validations (${usage.statusValid} valid, ${usage.statusInvalid} invalid, ${usage.statusCatchAll} catch-all, ${usage.statusUnknown} unknown).`;
    }

    return {
      output: { credits, usage },
      message
    };
  })
  .build();
