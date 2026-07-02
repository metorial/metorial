import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let updateJob = SlateTool.create(spec, {
  name: 'Update Test Job',
  key: 'update_job',
  description: `Update the metadata of a test job. You can set the name, tags, build, pass/fail status, visibility, and custom data. Works with both VDC and RDC jobs.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      jobId: z.string().describe('The unique ID of the test job to update'),
      source: z
        .enum(['vdc', 'rdc'])
        .default('vdc')
        .describe('Device source: vdc (virtual devices) or rdc (real devices)'),
      name: z.string().optional().describe('New name for the job'),
      tags: z.array(z.string()).optional().describe('New tags for the job'),
      passed: z
        .boolean()
        .optional()
        .describe('Mark the job as passed (true) or failed (false)'),
      build: z.string().optional().describe('Assign the job to a build'),
      visibility: z
        .enum(['public', 'public restricted', 'share', 'team', 'private'])
        .optional()
        .describe('Job visibility level (VDC only)'),
      customData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom key-value metadata to attach (VDC only)')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Updated job ID'),
      name: z.string().nullable().optional().describe('Updated job name'),
      status: z.string().optional().describe('Current job status'),
      passed: z.boolean().nullable().optional().describe('Pass/fail status'),
      build: z.string().nullable().optional().describe('Build assignment'),
      tags: z.array(z.string()).optional().describe('Updated tags')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.source === 'rdc') {
      let result = await client.updateRdcJob(ctx.input.jobId, {
        name: ctx.input.name,
        passed: ctx.input.passed,
        build: ctx.input.build,
        tags: ctx.input.tags
      });

      return {
        output: {
          jobId: result.id ?? ctx.input.jobId,
          name: result.name,
          status: result.consolidated_status ?? result.status,
          passed: result.passed,
          build: result.build,
          tags: result.tags
        },
        message: `Updated RDC job **${ctx.input.jobId}**.`
      };
    }

    let result = await client.updateJob(ctx.input.jobId, {
      name: ctx.input.name,
      tags: ctx.input.tags,
      passed: ctx.input.passed,
      build: ctx.input.build,
      public: ctx.input.visibility,
      customData: ctx.input.customData
    });

    return {
      output: {
        jobId: result.id ?? ctx.input.jobId,
        name: result.name,
        status: result.consolidated_status ?? result.status,
        passed: result.passed,
        build: result.build,
        tags: result.tags
      },
      message: `Updated VDC job **${ctx.input.jobId}**.`
    };
  })
  .build();
