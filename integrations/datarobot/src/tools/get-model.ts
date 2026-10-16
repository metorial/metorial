import { SlateTool } from 'slates';
import { z } from 'zod';
import { DataRobotClient, requireRecord, responseItems } from '../lib/client';
import { parseOutput } from '../lib/output';
import { spec } from '../spec';

let outputSchema = z.object({
  raw: z
    .record(z.string(), z.any())
    .optional()
    .describe('Provider response with credentials removed'),

  modelId: z.string().describe('Unique model identifier'),
  modelType: z.string().optional().describe('Type/algorithm of the model'),
  modelCategory: z.string().optional().describe('Model category'),
  blueprintId: z.string().optional().describe('Blueprint used to build the model'),
  samplePct: z.number().optional().nullable().describe('Percentage of data used for training'),
  trainingRowCount: z
    .number()
    .optional()
    .nullable()
    .describe('Number of rows used for training'),
  isFrozen: z.boolean().optional().describe('Whether the model is frozen'),
  metrics: z.record(z.string(), z.any()).optional().describe('Model performance metrics'),
  featureImpact: z
    .array(
      z.object({
        featureName: z.string().describe('Feature name'),
        impactNormalized: z.number().describe('Normalized impact score (0-1)'),
        impactUnnormalized: z.number().describe('Unnormalized impact score'),
        redundantWith: z
          .string()
          .optional()
          .nullable()
          .describe('Feature this is redundant with')
      })
    )
    .optional()
    .describe('Feature impact scores if requested')
});

export let getModel = SlateTool.create(spec, {
  name: 'Get Model Details',
  key: 'get_model',
  description: `Retrieve detailed information about a specific trained model including its type, metrics, training configuration, and optionally its feature impact scores.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project containing the model'),
      modelId: z.string().describe('ID of the model to retrieve'),
      includeFeatureImpact: z
        .boolean()
        .optional()
        .describe('Include feature impact scores (must have been computed previously)')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let client = new DataRobotClient({
      token: ctx.auth.token,
      endpointUrl: ctx.auth.endpointUrl ?? ctx.config.endpointUrl
    });

    let model = await client.getModel(ctx.input.projectId, ctx.input.modelId);

    let featureImpact: any[] | undefined;
    if (ctx.input.includeFeatureImpact) {
      let impact = requireRecord(
        await client.getFeatureImpact(ctx.input.projectId, ctx.input.modelId),
        'feature impact'
      );
      featureImpact = responseItems(impact.featureImpacts ?? impact, 'feature impacts').map(
        f => ({
          featureName: f.featureName,
          impactNormalized: f.impactNormalized,
          impactUnnormalized: f.impactUnnormalized,
          redundantWith: f.redundantWith
        })
      );
    }

    return {
      output: parseOutput(outputSchema, {
        raw: model,
        modelId: model.id ?? model.modelId,
        modelType: model.modelType,
        modelCategory: model.modelCategory,
        blueprintId: model.blueprintId,
        samplePct: model.samplePct,
        trainingRowCount: model.trainingRowCount,
        isFrozen: model.isFrozen,
        metrics: model.metrics,
        featureImpact
      }),
      message: `Model **${model.modelType}** (${model.id ?? model.modelId}) with ${model.samplePct ? `${model.samplePct}% sample` : 'full dataset'}.`
    };
  })
  .build();
