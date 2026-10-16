import { SlateTool } from 'slates';
import { z } from 'zod';
import { DataRobotClient, responseItems } from '../lib/client';
import { parseOutput } from '../lib/output';
import { spec } from '../spec';

let outputSchema = z.object({
  predictions: z.array(z.record(z.string(), z.any())).describe('Array of prediction results')
});

export let makePredictions = SlateTool.create(spec, {
  name: 'Make Predictions',
  key: 'make_predictions',
  description: `Make real-time predictions using a model in a serverless prediction environment. Pass an array of data rows as key-value objects. Optionally include prediction explanations to understand why the model makes each prediction.`,
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
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let client = new DataRobotClient({
      token: ctx.auth.token,
      endpointUrl: ctx.auth.endpointUrl ?? ctx.config.endpointUrl
    });

    let result = await client.makePredictions(ctx.input.deploymentId, ctx.input.rows, {
      maxExplanations: ctx.input.maxExplanations
    });

    let predArray = responseItems(result, 'predictions');

    return {
      output: parseOutput(outputSchema, { predictions: predArray }),
      message: `Generated **${predArray.length}** prediction(s) from deployment **${ctx.input.deploymentId}**.`
    };
  })
  .build();
