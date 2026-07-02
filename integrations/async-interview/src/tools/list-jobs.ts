import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listJobs = SlateTool.create(spec, {
  name: 'List Jobs',
  key: 'list_jobs',
  description: `List all interview jobs (positions) from your Async Interview account. Each job represents an interview campaign tied to an open position. Use this to discover available jobs and their identifiers for further operations.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      jobs: z.array(z.record(z.string(), z.unknown())).describe('List of interview jobs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let jobs = await client.listJobs();

    return {
      output: {
        jobs: jobs as Record<string, unknown>[]
      },
      message: `Retrieved **${jobs.length}** interview job(s).`
    };
  })
  .build();
