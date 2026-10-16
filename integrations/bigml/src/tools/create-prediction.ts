import { SlateTool } from 'slates';
import { z } from 'zod';
import { supervisedReference } from '../lib/client';
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
      explain: z.boolean().optional().describe('Request a prediction explanation'),
      projectId: z
        .string()
        .optional()
        .describe('Project ID; discover projects with list_resources'),
      tags: z.array(z.string()).optional().describe('Tags to assign to the prediction')
    })
  )
  .output(
    z.object({
      raw: z.record(z.string(), z.unknown()).optional().describe('Complete BigML response'),
      resourceId: z.string().describe('BigML resource ID for the prediction'),
      prediction: z.any().describe('The predicted value'),
      predictedValue: z.any().optional().describe('Predicted objective value when available'),
      confidence: z.number().optional().describe('Confidence of the prediction'),
      probability: z.number().optional().describe('Probability of the predicted class'),
      created: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let body: Record<string, unknown> = {
      ...supervisedReference(ctx.input.modelId),
      input_data: ctx.input.inputData
    };

    if (ctx.input.name !== undefined) body.name = ctx.input.name;
    if (ctx.input.tags !== undefined) body.tags = ctx.input.tags;

    if (ctx.input.explain !== undefined) body.explain = ctx.input.explain;
    if (ctx.input.projectId !== undefined) body.project = ctx.input.projectId;

    let result = await client.createResource('prediction', body);

    let prediction = result.prediction ?? result.output;
    let confidence = result.confidence;
    let probability = result.probability;

    return {
      output: {
        raw: result,
        resourceId: result.resource,
        prediction,
        predictedValue:
          result.output ??
          (result.objective_fields?.[0] &&
          typeof result.prediction === 'object' &&
          result.prediction !== null
            ? (result.prediction as Record<string, unknown>)[result.objective_fields[0]]
            : undefined),
        confidence,
        probability,
        created: result.created
      },
      message: `Prediction **${result.resource}** created. Predicted value: **${JSON.stringify(prediction)}**${confidence !== undefined ? `, confidence: ${confidence}` : ''}${probability !== undefined ? `, probability: ${probability}` : ''}.`
    };
  })
  .build();
