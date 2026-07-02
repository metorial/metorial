import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let checkUsage = SlateTool.create(spec, {
  name: 'Check Account Usage',
  key: 'check_usage',
  description: `Check your ScrapingBee account usage and remaining API credits. Useful for monitoring consumption and ensuring you have enough credits for upcoming tasks.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      maxApiCredit: z
        .number()
        .optional()
        .describe('Maximum API credits for the billing period'),
      usedApiCredit: z
        .number()
        .optional()
        .describe('API credits used in the current billing period'),
      maxConcurrency: z.number().optional().describe('Maximum concurrent requests allowed'),
      currentConcurrency: z
        .number()
        .optional()
        .describe('Current number of concurrent requests')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getUsage();

    return {
      output: {
        maxApiCredit: result?.max_api_credit,
        usedApiCredit: result?.used_api_credit,
        maxConcurrency: result?.max_concurrency,
        currentConcurrency: result?.current_concurrency
      },
      message: `Account usage: **${result?.used_api_credit ?? 'N/A'}** / **${result?.max_api_credit ?? 'N/A'}** credits used. Concurrency: **${result?.current_concurrency ?? 'N/A'}** / **${result?.max_concurrency ?? 'N/A'}**.`
    };
  });
