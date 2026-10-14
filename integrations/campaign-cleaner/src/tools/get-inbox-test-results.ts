import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getInboxTestResults = SlateTool.create(spec, {
  name: 'Get Inbox Test Results',
  key: 'get_inbox_test_results',
  description:
    'Retrieve inbox placement results for a test created with Create Inbox Test. Shows the inbox and spam rates, pending seeds, and delivery details for each provider. Results update as mailboxes receive your campaign.',
  instructions: [
    'Use the job ID returned by Create Inbox Test.',
    'A Processing status means some seed mailboxes have not received the campaign. Check again in a few minutes and ensure you sent the campaign to every seed address.'
  ],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      jobId: z.string().min(1).describe('Inbox test ID returned by Create Inbox Test')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Inbox test ID'),
      testName: z.string().describe('Name of the inbox test'),
      submittedDate: z.string().describe('Timestamp when the test was created'),
      submittedBy: z.string().describe('Email address of the account that created the test'),
      status: z.string().describe('Processing or Completed'),
      summary: z.object({
        totalSeeds: z.number().describe('Total seed mailboxes'),
        received: z.number().describe('Seeds that have received the campaign'),
        inbox: z.number().describe('Seeds where the campaign reached the inbox'),
        spam: z.number().describe('Seeds where the campaign reached spam or junk'),
        unknownPlacement: z
          .number()
          .describe('Received emails whose placement could not be determined'),
        pending: z.number().describe('Seeds still waiting to receive the campaign'),
        inboxRate: z
          .number()
          .describe('Percentage of all seeds where the campaign reached the inbox'),
        spamRate: z
          .number()
          .describe('Percentage of all seeds where the campaign reached spam')
      }),
      results: z.array(
        z.object({
          provider: z.string().describe('Email provider name'),
          seedAddress: z.string().describe('Seed email address'),
          emailFound: z.boolean().describe('Whether this seed received the campaign'),
          placement: z
            .string()
            .describe('Inbox, Spam, Pending, or another provider-reported placement'),
          spfStatus: z.string().describe('SPF authentication result'),
          senderIp: z.string().describe('IP address that sent the campaign'),
          submissionResult: z.string().describe('Additional submission details')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getInboxTestResults(ctx.input.jobId);
    return {
      output: result,
      message: `Inbox test **${result.testName}** is ${result.status}: ${result.summary.inboxRate}% inbox, ${result.summary.spamRate}% spam, ${result.summary.pending} pending seeds.`
    };
  })
  .build();
