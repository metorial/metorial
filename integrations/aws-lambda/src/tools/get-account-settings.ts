import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getAccountSettings = SlateTool.create(spec, {
  name: 'Get Account Settings',
  key: 'get_account_settings',
  description: `Retrieve Lambda account-level settings and limits for the configured region, including concurrent execution limits, code storage usage, and total code size.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      totalCodeSize: z.number().optional().describe('Total code storage used in bytes'),
      codeSizeUnzipped: z.number().optional().describe('Maximum unzipped deployment size'),
      codeSizeZipped: z.number().optional().describe('Maximum zipped deployment size'),
      concurrentExecutions: z.number().optional().describe('Concurrent execution limit'),
      unreservedConcurrentExecutions: z
        .number()
        .optional()
        .describe('Unreserved concurrent executions available')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let result = await client.getAccountSettings();

    let usage = result.AccountUsage || {};
    let limits = result.AccountLimit || {};

    return {
      output: {
        totalCodeSize: usage.TotalCodeSize,
        codeSizeUnzipped: limits.CodeSizeUnzipped,
        codeSizeZipped: limits.CodeSizeZipped,
        concurrentExecutions: limits.ConcurrentExecutions,
        unreservedConcurrentExecutions: limits.UnreservedConcurrentExecutions
      },
      message: `Account limits: **${limits.ConcurrentExecutions}** concurrent executions, **${limits.UnreservedConcurrentExecutions}** unreserved. Code storage: **${(usage.TotalCodeSize / (1024 * 1024 * 1024)).toFixed(2)} GB** used.`
    };
  })
  .build();
