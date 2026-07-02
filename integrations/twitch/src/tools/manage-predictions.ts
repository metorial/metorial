import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwitchClient } from '../lib/client';
import { spec } from '../spec';

export let managePredictions = SlateTool.create(spec, {
  name: 'Manage Predictions',
  key: 'manage_predictions',
  description: `Create, resolve, lock, cancel, or view Channel Points predictions. Viewers wager Channel Points on prediction outcomes.`,
  instructions: [
    'To **create**, provide title, outcomes (2-10 options), and predictionWindowSeconds.',
    'To **resolve**, provide predictionId and winningOutcomeId.',
    'To **lock** (stop new predictions), set endStatus to "LOCKED".',
    'To **cancel** (refund all points), set endStatus to "CANCELED".'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      broadcasterId: z.string().describe('Broadcaster user ID'),
      action: z.enum(['create', 'end', 'get']).describe('Action to perform'),
      title: z.string().optional().describe('Prediction title (for create)'),
      outcomes: z
        .array(z.string())
        .optional()
        .describe('Outcome titles (2-10 items, for create)'),
      predictionWindowSeconds: z
        .number()
        .optional()
        .describe('How long viewers can make predictions in seconds (for create)'),
      predictionId: z.string().optional().describe('Prediction ID (for end/get)'),
      endStatus: z
        .enum(['RESOLVED', 'CANCELED', 'LOCKED'])
        .optional()
        .describe('How to end the prediction'),
      winningOutcomeId: z
        .string()
        .optional()
        .describe('Winning outcome ID (required when endStatus is RESOLVED)'),
      maxResults: z.number().optional().describe('Max predictions to return (for get)'),
      cursor: z.string().optional().describe('Pagination cursor (for get)')
    })
  )
  .output(
    z.object({
      prediction: z
        .object({
          predictionId: z.string(),
          title: z.string(),
          outcomes: z.array(
            z.object({
              outcomeId: z.string(),
              title: z.string(),
              users: z.number(),
              channelPoints: z.number(),
              color: z.string()
            })
          ),
          status: z.string(),
          predictionWindow: z.number(),
          createdAt: z.string(),
          winningOutcomeId: z.string().optional()
        })
        .optional(),
      predictions: z
        .array(
          z.object({
            predictionId: z.string(),
            title: z.string(),
            status: z.string(),
            createdAt: z.string()
          })
        )
        .optional(),
      cursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwitchClient(ctx.auth.token, ctx.auth.clientId);

    if (ctx.input.action === 'create') {
      if (!ctx.input.title || !ctx.input.outcomes || !ctx.input.predictionWindowSeconds) {
        throw new Error(
          'title, outcomes, and predictionWindowSeconds are required to create a prediction'
        );
      }

      let prediction = await client.createPrediction(ctx.input.broadcasterId, {
        title: ctx.input.title,
        outcomes: ctx.input.outcomes,
        predictionWindow: ctx.input.predictionWindowSeconds
      });

      return {
        output: {
          prediction: {
            predictionId: prediction.id,
            title: prediction.title,
            outcomes: prediction.outcomes.map(o => ({
              outcomeId: o.id,
              title: o.title,
              users: o.users,
              channelPoints: o.channel_points,
              color: o.color
            })),
            status: prediction.status,
            predictionWindow: prediction.prediction_window,
            createdAt: prediction.created_at,
            winningOutcomeId: prediction.winning_outcome_id || undefined
          }
        },
        message: `Created prediction: **${prediction.title}** with ${prediction.outcomes.length} outcomes`
      };
    }

    if (ctx.input.action === 'end') {
      if (!ctx.input.predictionId || !ctx.input.endStatus) {
        throw new Error('predictionId and endStatus are required to end a prediction');
      }
      if (ctx.input.endStatus === 'RESOLVED' && !ctx.input.winningOutcomeId) {
        throw new Error('winningOutcomeId is required when resolving a prediction');
      }

      let prediction = await client.endPrediction(
        ctx.input.broadcasterId,
        ctx.input.predictionId,
        ctx.input.endStatus,
        ctx.input.winningOutcomeId
      );

      return {
        output: {
          prediction: {
            predictionId: prediction.id,
            title: prediction.title,
            outcomes: prediction.outcomes.map(o => ({
              outcomeId: o.id,
              title: o.title,
              users: o.users,
              channelPoints: o.channel_points,
              color: o.color
            })),
            status: prediction.status,
            predictionWindow: prediction.prediction_window,
            createdAt: prediction.created_at,
            winningOutcomeId: prediction.winning_outcome_id || undefined
          }
        },
        message: `Prediction **${prediction.title}** ${ctx.input.endStatus.toLowerCase()}`
      };
    }

    // get
    let result = await client.getPredictions(ctx.input.broadcasterId, {
      predictionIds: ctx.input.predictionId ? [ctx.input.predictionId] : undefined,
      first: ctx.input.maxResults,
      after: ctx.input.cursor
    });

    let predictions = result.predictions.map(p => ({
      predictionId: p.id,
      title: p.title,
      status: p.status,
      createdAt: p.created_at
    }));

    return {
      output: { predictions, cursor: result.cursor },
      message:
        predictions.length === 0
          ? 'No predictions found'
          : `Found **${predictions.length}** predictions`
    };
  })
  .build();
