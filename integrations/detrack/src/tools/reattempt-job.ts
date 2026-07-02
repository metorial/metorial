import { SlateTool } from 'slates';
import { z } from 'zod';
import { DetrackClient } from '../lib/client';
import { spec } from '../spec';

export let reattemptJobTool = SlateTool.create(spec, {
  name: 'Reattempt Job',
  key: 'reattempt_job',
  description: `Reattempts a previously failed job in Detrack. This increments the attempt counter and resets the job for another delivery or collection attempt.`,
  instructions: ['Only failed jobs can be reattempted.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      doNumber: z.string().describe('Delivery order number of the failed job'),
      date: z.string().describe('Job date in YYYY-MM-DD format')
    })
  )
  .output(
    z.object({
      jobId: z.string().optional().describe('Detrack-assigned job ID'),
      doNumber: z.string().describe('Delivery order number'),
      date: z.string().describe('Job date'),
      status: z.string().optional().describe('Updated job status'),
      attempt: z.number().optional().describe('Current attempt number'),
      raw: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Full job response from Detrack')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DetrackClient(ctx.auth.token);

    let result = await client.reattemptJob(ctx.input.doNumber, ctx.input.date);

    return {
      output: {
        jobId: result.id ? String(result.id) : undefined,
        doNumber: String(result.do_number ?? ctx.input.doNumber),
        date: String(result.date ?? ctx.input.date),
        status: result.status ? String(result.status) : undefined,
        attempt: typeof result.attempt === 'number' ? result.attempt : undefined,
        raw: result
      },
      message: `Reattempted job **${ctx.input.doNumber}** for ${ctx.input.date}.${typeof result.attempt === 'number' ? ` Attempt #${result.attempt}.` : ''}`
    };
  })
  .build();
