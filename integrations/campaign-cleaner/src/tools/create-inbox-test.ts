import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createInboxTest = SlateTool.create(spec, {
  name: 'Create Inbox Test',
  key: 'create_inbox_test',
  description:
    'Create an inbox placement test and receive the seed email addresses to send your campaign to. Send the campaign through your email service to every returned address, then use Get Inbox Test Results to check inbox and spam placement.',
  constraints: [
    'Requires an active Campaign Cleaner subscription or standalone Inbox Placement Tester subscription.',
    'Creating a test consumes one API credit.',
    'This tool creates a test; you must send the email campaign to the returned seed addresses through your email service.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      testName: z
        .string()
        .min(1)
        .max(255)
        .describe('Descriptive name for the inbox test, up to 255 characters')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Inbox test ID to pass to Get Inbox Test Results'),
      testName: z.string().describe('Name of the inbox test'),
      mailtesterAddress: z.string().describe('Monitoring address already included in sendTo'),
      instructions: z.string().describe('Next steps provided by Campaign Cleaner'),
      sendTo: z
        .array(z.string())
        .describe('Send your email campaign to every seed address in this list')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createInboxTest(ctx.input.testName);
    return {
      output: result,
      message: `Inbox test **${result.testName}** created. Send your campaign to all ${result.sendTo.length} seed addresses, then retrieve results using job ID ${result.jobId}.`
    };
  })
  .build();
