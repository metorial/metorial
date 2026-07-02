import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPrediction = SlateTool.create(spec, {
  name: 'Get Prediction',
  key: 'get_prediction',
  description: `Retrieve the current status and results of a prediction. Use this to check if a prediction has completed and to fetch its output.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      predictionId: z.string().describe('ID of the prediction to retrieve')
    })
  )
  .output(
    z.object({
      predictionId: z.string().describe('Unique identifier of the prediction'),
      model: z.string().optional().describe('Model identifier (owner/name)'),
      version: z.string().optional().describe('Model version ID used'),
      status: z
        .string()
        .describe('Current status: starting, processing, succeeded, failed, canceled'),
      input: z.any().optional().describe('Input provided to the model'),
      output: z.any().optional().describe('Model output'),
      error: z.string().optional().nullable().describe('Error message if prediction failed'),
      logs: z.string().optional().describe('Log output from the prediction'),
      metrics: z.record(z.string(), z.any()).optional().describe('Prediction metrics'),
      createdAt: z.string().describe('When the prediction was created'),
      startedAt: z
        .string()
        .optional()
        .nullable()
        .describe('When the prediction started processing'),
      completedAt: z.string().optional().nullable().describe('When the prediction completed'),
      urls: z.record(z.string(), z.string()).optional().describe('Related URLs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getPrediction(ctx.input.predictionId);

    return {
      output: {
        predictionId: result.id,
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
        completedAt: result.completed_at,
        urls: result.urls
      },
      message: `Prediction **${result.id}** is **${result.status}**.`
    };
  })
  .build();
