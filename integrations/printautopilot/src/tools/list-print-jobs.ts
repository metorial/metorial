import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPrintJobs = SlateTool.create(spec, {
  name: 'List Print Jobs',
  key: 'list_print_jobs',
  description: `Retrieves print jobs from your PrintAutopilot account. Use this to monitor and track the status of submitted documents across your print queues.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      printJobs: z
        .array(z.any())
        .describe('List of print jobs from the PrintAutopilot account.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    ctx.progress('Fetching print jobs...');

    let response = await client.getPrintJobs();

    let printJobs = Array.isArray(response) ? response : (response?.data ?? [response]);

    return {
      output: {
        printJobs
      },
      message: `Retrieved **${printJobs.length}** print job(s).`
    };
  })
  .build();
