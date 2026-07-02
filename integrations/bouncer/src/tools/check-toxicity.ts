import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let checkToxicity = SlateTool.create(spec, {
  name: 'Check Email Toxicity',
  key: 'check_toxicity',
  description: `Create a toxicity check job for a list of email addresses. Identifies toxic emails such as widely circulated or breached addresses, complainers, litigators, and potential spam traps. Returns a job ID to track progress and download results.`,
  instructions: [
    'Use the **Get Toxicity Results** tool to download results once the job is completed.',
    'Use the **Get Toxicity Status** tool to check if the job is still processing.'
  ],
  constraints: ['Rate limited to 10 lists per minute.'],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      emails: z.array(z.string()).describe('List of email addresses to check for toxicity')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Unique identifier for the toxicity check job'),
      createdAt: z.string().describe('ISO 8601 timestamp when the job was created'),
      status: z.string().describe('Current job status (e.g. processing)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createToxicityJob(ctx.input.emails);

    return {
      output: {
        jobId: result.id,
        createdAt: result.createdAt,
        status: result.status
      },
      message: `Created toxicity check job **${result.id}** for **${ctx.input.emails.length}** emails. Status: **${result.status}**`
    };
  })
  .build();
