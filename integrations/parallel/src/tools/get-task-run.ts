import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTaskRun = SlateTool.create(spec, {
  name: 'Get Task Run',
  key: 'get_task_run',
  description: `Check the status of a deep research task run and optionally retrieve its results when complete.
Use the run ID returned by the **Deep Research** tool.`,
  instructions: [
    'Set includeResult to true to retrieve the full results when the run is completed.',
    'If the run is not yet complete and includeResult is true, this will wait (long-poll) until the run finishes.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      runId: z.string().describe('Task run ID from the Deep Research tool'),
      includeResult: z
        .boolean()
        .optional()
        .describe(
          'If true, fetch the full result (blocks until the run completes). Defaults to false.'
        )
    })
  )
  .output(
    z.object({
      runId: z.string().describe('Task run ID'),
      status: z.string().describe('Current status: queued, running, completed, or failed'),
      isActive: z.boolean().describe('Whether the run is still active'),
      processor: z.string().describe('Processor tier used'),
      metadata: z.record(z.string(), z.string()).nullable().describe('Attached metadata'),
      createdAt: z.string().describe('Creation timestamp'),
      modifiedAt: z.string().describe('Last modification timestamp'),
      result: z
        .object({
          output: z.unknown().describe('Structured or text output of the research'),
          basis: z
            .array(
              z.object({
                field: z.string().describe('Output field name'),
                citations: z
                  .array(
                    z.object({
                      url: z.string().describe('Source URL'),
                      excerpts: z.array(z.string()).describe('Relevant excerpts')
                    })
                  )
                  .describe('Citations supporting this field'),
                reasoning: z.string().describe('Reasoning for the field value'),
                confidence: z.string().describe('Confidence level: high, medium, or low')
              })
            )
            .describe('Per-field citations, reasoning, and confidence')
        })
        .nullable()
        .describe('Research results (null if not requested or run not complete)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let run = await client.getTaskRun(ctx.input.runId);

    let result: any = null;
    if (ctx.input.includeResult && run.status === 'completed') {
      result = await client.getTaskRunResult(ctx.input.runId);
    } else if (ctx.input.includeResult && run.isActive) {
      result = await client.getTaskRunResult(ctx.input.runId);
      run = await client.getTaskRun(ctx.input.runId);
    }

    return {
      output: {
        runId: run.runId,
        status: run.status,
        isActive: run.isActive,
        processor: run.processor,
        metadata: run.metadata,
        createdAt: run.createdAt,
        modifiedAt: run.modifiedAt,
        result
      },
      message: `Task run **${run.runId}** status: **${run.status}**${result ? ' — results retrieved.' : '.'}`
    };
  })
  .build();
