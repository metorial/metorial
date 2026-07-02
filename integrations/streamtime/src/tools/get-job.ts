import { SlateTool } from 'slates';
import { z } from 'zod';
import { StreamtimeClient } from '../lib/client';
import { spec } from '../spec';

export let getJob = SlateTool.create(spec, {
  name: 'Get Job',
  key: 'get_job',
  description: `Retrieve a job (project) by its ID, including all its details such as name, number, status, budget, company, contact, and lead user. Optionally also fetches the job's phases, items, and milestones.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      jobId: z.number().describe('ID of the job to retrieve'),
      includePhases: z.boolean().optional().describe('Also fetch the job phases'),
      includeItems: z
        .boolean()
        .optional()
        .describe('Also fetch the job items (line items in the job plan)'),
      includeMilestones: z.boolean().optional().describe('Also fetch the job milestones')
    })
  )
  .output(
    z.object({
      jobId: z.number().describe('ID of the job'),
      name: z.string().describe('Name of the job'),
      number: z.string().optional().describe('Job number'),
      raw: z.record(z.string(), z.any()).describe('Full job object as returned by the API'),
      phases: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Job phases if requested'),
      items: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Job items if requested'),
      milestones: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Job milestones if requested')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StreamtimeClient({ token: ctx.auth.token });

    let job = await client.getJob(ctx.input.jobId);

    let output: Record<string, any> = {
      jobId: job.id,
      name: job.name,
      number: job.number,
      raw: job
    };

    if (ctx.input.includePhases) {
      output.phases = await client.listJobPhases(ctx.input.jobId);
    }
    if (ctx.input.includeItems) {
      output.items = await client.listJobItems(ctx.input.jobId);
    }
    if (ctx.input.includeMilestones) {
      output.milestones = await client.listJobMilestones(ctx.input.jobId);
    }

    return {
      output: output as any,
      message: `Retrieved job **${job.name}**${job.number ? ` (#${job.number})` : ''} (ID: ${job.id}).`
    };
  })
  .build();
