import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPredictions = SlateTool.create(spec, {
  name: 'List Predictions',
  key: 'list_predictions',
  description: `List recent predictions for your account. Returns predictions sorted by creation time (newest first) with pagination support.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      predictions: z.array(
        z.object({
          predictionId: z.string().describe('Prediction ID'),
          model: z.string().optional().describe('Model identifier'),
          version: z.string().optional().describe('Version ID'),
          status: z.string().describe('Current status'),
          createdAt: z.string().describe('Creation timestamp'),
          completedAt: z.string().optional().nullable().describe('Completion timestamp')
        })
      ),
      nextCursor: z
        .string()
        .optional()
        .nullable()
        .describe('Cursor for the next page of results'),
      previousCursor: z.string().optional().nullable().describe('Cursor for the previous page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listPredictions({ cursor: ctx.input.cursor });

    let predictions = (result.results || []).map((p: any) => ({
      predictionId: p.id,
      model: p.model,
      version: p.version,
      status: p.status,
      createdAt: p.created_at,
      completedAt: p.completed_at
    }));

    let nextCursor = result.next ? new URL(result.next).searchParams.get('cursor') : null;
    let previousCursor = result.previous
      ? new URL(result.previous).searchParams.get('cursor')
      : null;

    return {
      output: {
        predictions,
        nextCursor,
        previousCursor
      },
      message: `Found **${predictions.length}** predictions.`
    };
  })
  .build();
