import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createJob = SlateTool.create(spec, {
  name: 'Create Scraping Job',
  key: 'create_job',
  description: `Queue a new scraping job for an existing Hystruct workflow. This triggers the AI crawling and data extraction process for the workflow's target URL. The job runs asynchronously; results can be retrieved once the job completes.`,
  instructions: [
    'Only one job can be queued per workflow at a time. If a job is already running or queued, the request will fail.'
  ],
  constraints: [
    'Jobs process asynchronously and crawling sub-pages may take up to 5 minutes depending on the site.',
    'Rate limit: 100 requests per minute.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      workflowId: z.string().describe('The ID of the workflow to run a scraping job for.')
    })
  )
  .output(
    z.object({
      message: z.string().describe('Confirmation message from the API.'),
      workflowId: z.string().describe('The workflow ID the job was queued for.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createJob(ctx.input.workflowId);

    return {
      output: {
        message: result.message,
        workflowId: ctx.input.workflowId
      },
      message: `Scraping job queued for workflow \`${ctx.input.workflowId}\`. The job will process asynchronously and may take up to 5 minutes.`
    };
  })
  .build();
