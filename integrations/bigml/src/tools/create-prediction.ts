import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createPrediction = SlateTool.create(spec, {
  name: 'Create Prediction',
  key: 'create_prediction',
  description: `Generate a prediction from a trained supervised model. Supports predictions from decision trees, ensembles, deepnets, logistic regressions, linear regressions, and fusions.
Provide input data as field-value pairs. Returns the predicted outcome along with confidence/probability information.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      modelId: z
        .string()
        .describe(
          'Resource ID of the model to use (e.g., "model/abc123", "ensemble/abc123", "deepnet/abc123", "fusion/abc123")'
        ),
      inputData: z
        .record(z.string(), z.any())
        .describe(
          'Input data as field name or field ID to value mapping (e.g., {"sepal length": 5.1, "sepal width": 3.5})'
        ),
      name: z.string().optional().describe('Name for the prediction'),
      tags: z.array(z.string()).optional().describe('Tags to assign to the prediction')
    })
  )
  .output(
    z.object({
      resourceId: z.string().describe('BigML resource ID for the prediction'),
      prediction: z.any().describe('The predicted value'),
      confidence: z.number().optional().describe('Confidence of the prediction'),
      probability: z.number().optional().describe('Probability of the predicted class'),
      created: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let modelId = ctx.input.modelId;
    let modelType = modelId.split('/')[0];

    let body: Record<string, any> = {
      input_data: ctx.input.inputData
    };

    // Set the appropriate model reference field based on the model type
    if (modelType === 'ensemble') {
      body.ensemble = modelId;
    } else if (modelType === 'deepnet') {
      body.deepnet = modelId;
    } else if (modelType === 'logisticregression') {
      body.logisticregression = modelId;
    } else if (modelType === 'linearregression') {
      body.linearregression = modelId;
    } else if (modelType === 'fusion') {
      body.fusion = modelId;
    } else {
      body.model = modelId;
    }

    if (ctx.input.name) body.name = ctx.input.name;
    if (ctx.input.tags) body.tags = ctx.input.tags;

    let result = await client.createResource('prediction', body);

    let prediction = result.prediction ?? result.output;
    let confidence = result.confidence;
    let probability = result.probability;

    return {
      output: {
        resourceId: result.resource,
        prediction,
        confidence,
        probability,
        created: result.created
      },
      message: `Prediction **${result.resource}** created. Predicted value: **${JSON.stringify(prediction)}**${confidence !== undefined ? `, confidence: ${confidence}` : ''}${probability !== undefined ? `, probability: ${probability}` : ''}.`
    };
  })
  .build();
