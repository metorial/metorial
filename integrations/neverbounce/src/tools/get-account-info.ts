import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccountInfoTool = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account_info',
  description: `Retrieve the current NeverBounce account information including credit balance (paid and free credits used/remaining) and job counts by status.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      paidCreditsUsed: z.number().describe('Number of paid credits used'),
      freeCreditsUsed: z.number().describe('Number of free credits used'),
      paidCreditsRemaining: z.number().describe('Number of paid credits remaining'),
      freeCreditsRemaining: z.number().describe('Number of free credits remaining'),
      completedJobs: z.number().describe('Number of completed jobs'),
      underReviewJobs: z.number().describe('Number of jobs under review'),
      queuedJobs: z.number().describe('Number of queued jobs'),
      processingJobs: z.number().describe('Number of jobs currently processing')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getAccountInfo();

    return {
      output: {
        paidCreditsUsed: result.creditsInfo.paidCreditsUsed,
        freeCreditsUsed: result.creditsInfo.freeCreditsUsed,
        paidCreditsRemaining: result.creditsInfo.paidCreditsRemaining,
        freeCreditsRemaining: result.creditsInfo.freeCreditsRemaining,
        completedJobs: result.jobCounts.completed,
        underReviewJobs: result.jobCounts.underReview,
        queuedJobs: result.jobCounts.queued,
        processingJobs: result.jobCounts.processing
      },
      message: `Account has **${result.creditsInfo.paidCreditsRemaining}** paid credits and **${result.creditsInfo.freeCreditsRemaining}** free credits remaining. Jobs: ${result.jobCounts.completed} completed, ${result.jobCounts.processing} processing, ${result.jobCounts.queued} queued.`
    };
  })
  .build();
