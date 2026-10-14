import { SlateTool } from 'slates';
import { z } from 'zod';
import { AscoraClient } from '../lib/client';
import { spec } from '../spec';

export let getJob = SlateTool.create(spec, {
  name: 'Get Job',
  key: 'get_job',
  description:
    'Retrieve an Ascora job by its full job number, including status, customer relationships, address and pricing. Use list_jobs to find a job number.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      jobNumber: z.string().min(1).describe('Full job number, such as J112, from list_jobs')
    })
  )
  .output(z.object({ job: z.any().describe('Complete job record from Ascora') }))
  .handleInvocation(async ctx => {
    let job = await new AscoraClient(ctx.auth).getJob(ctx.input.jobNumber);
    return {
      output: { job },
      message: `Retrieved job **${ctx.input.jobNumber}** from Ascora.`
    };
  })
  .build();
