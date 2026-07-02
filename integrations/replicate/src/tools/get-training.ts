import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTraining = SlateTool.create(spec, {
  name: 'Get Training',
  key: 'get_training',
  description: `Retrieve the current status and results of a training job. Use this to monitor fine-tuning progress and check completion.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      trainingId: z.string().describe('ID of the training to retrieve')
    })
  )
  .output(
    z.object({
      trainingId: z.string().describe('Training ID'),
      model: z.string().optional().describe('Base model identifier'),
      version: z.string().optional().describe('Base model version'),
      status: z
        .string()
        .describe('Current status: starting, processing, succeeded, failed, canceled'),
      input: z.any().optional().describe('Training input parameters'),
      output: z.any().optional().describe('Training output (version info and weights URL)'),
      error: z.string().optional().nullable().describe('Error message if training failed'),
      logs: z.string().optional().describe('Training log output'),
      metrics: z.record(z.string(), z.any()).optional().describe('Training metrics'),
      createdAt: z.string().describe('When the training was created'),
      startedAt: z.string().optional().nullable().describe('When training started'),
      completedAt: z.string().optional().nullable().describe('When training completed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getTraining(ctx.input.trainingId);

    return {
      output: {
        trainingId: result.id,
        model: result.model,
        version: result.version,
        status: result.status,
        input: result.input,
        output: result.output,
        error: result.error,
        logs: result.logs,
        metrics: result.metrics,
        createdAt: result.created_at,
        startedAt: result.started_at,
        completedAt: result.completed_at
      },
      message: `Training **${result.id}** is **${result.status}**.`
    };
  })
  .build();
