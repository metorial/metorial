import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GraphHopperClient } from '../lib/client';
import { spec } from '../spec';

export let getOptimizationSolution = SlateTool.create(spec, {
  name: 'Get Optimization Solution',
  key: 'get_optimization_solution',
  description:
    'Retrieve the current status and solution of a route optimization job by its ID. Use this to recover results when optimize_routes reaches its polling timeout.',
  instructions: [
    'Use the job ID returned by optimize_routes or included in its timeout message.',
    'Call again while the status is waiting_in_queue or processing. A finished job includes its solution.'
  ],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      jobId: z.string().describe('GraphHopper optimization job ID')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Optimization job ID'),
      status: z.string().describe('Job status: waiting_in_queue, processing, or finished'),
      solution: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Completed solution including route, vehicle, and unassigned job details'),
      processingTimeMs: z
        .number()
        .optional()
        .describe('Server processing time in milliseconds'),
      waitingTimeInQueueMs: z
        .number()
        .optional()
        .describe('Time spent in the processing queue in milliseconds')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GraphHopperClient({ token: ctx.auth.token });
    let result = await client.getOptimizationSolution(ctx.input.jobId);
    if (typeof result.status !== 'string') {
      throw createApiServiceError('GraphHopper did not return an optimization job status.');
    }
    if (result.status === 'finished' && !result.solution) {
      throw createApiServiceError(
        'GraphHopper finished the optimization job without returning a solution.',
        {
          upstreamStatus: result.status
        }
      );
    }
    return {
      output: {
        jobId: ctx.input.jobId,
        status: result.status,
        solution: result.solution ?? undefined,
        processingTimeMs: result.processing_time,
        waitingTimeInQueueMs: result.waiting_time_in_queue
      },
      message: `Optimization job ${ctx.input.jobId}: ${result.status}.`
    };
  })
  .build();
