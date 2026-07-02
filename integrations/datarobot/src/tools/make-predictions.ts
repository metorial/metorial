import { SlateTool } from 'slates';
import { z } from 'zod';
import { DataRobotClient } from '../lib/client';
import { spec } from '../spec';

export let makePredictions = SlateTool.create(spec, {
  name: 'Make Predictions',
  key: 'make_predictions',
  description: `Make real-time predictions using a deployed model. Pass an array of data rows as key-value objects. Optionally include prediction explanations to understand why the model makes each prediction.`,
  instructions: [
    'Each row in the rows array should be an object with feature names as keys and their values.',
    'Set maxExplanations to a positive integer (e.g. 3) to include prediction explanations for each row.'
  ]
})
  .input(
    z.object({
      deploymentId: z.string().describe('ID of the deployment to make predictions against'),
      rows: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of data rows as key-value objects with feature names and values'),
      maxExplanations: z
        .number()
        .optional()
        .describe('Number of prediction explanations to include per row (0 = none)')
    })
  )
  .output(
    z.object({
      predictions: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of prediction results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DataRobotClient({
      token: ctx.auth.token,
      endpointUrl: ctx.config.endpointUrl
    });

    let result = await client.makePredictions(
      ctx.input.deploymentId,
      ctx.input.rows,
      ctx.input.maxExplanations ? { maxExplanations: ctx.input.maxExplanations } : undefined
    );

    let predictions = result.data || result.predictions || result;
    let predArray = Array.isArray(predictions) ? predictions : [predictions];

    return {
      output: { predictions: predArray },
      message: `Generated **${predArray.length}** prediction(s) from deployment **${ctx.input.deploymentId}**.`
    };
  })
  .build();
