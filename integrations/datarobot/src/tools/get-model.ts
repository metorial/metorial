import { SlateTool } from 'slates';
import { z } from 'zod';
import { DataRobotClient } from '../lib/client';
import { spec } from '../spec';

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
  .output(
    z.object({
      modelId: z.string().describe('Unique model identifier'),
      modelType: z.string().optional().describe('Type/algorithm of the model'),
      modelCategory: z.string().optional().describe('Model category'),
      blueprintId: z.string().optional().describe('Blueprint used to build the model'),
      samplePct: z
        .number()
        .optional()
        .nullable()
        .describe('Percentage of data used for training'),
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
    })
  )
  .handleInvocation(async ctx => {
    let client = new DataRobotClient({
      token: ctx.auth.token,
      endpointUrl: ctx.config.endpointUrl
    });

    let model = await client.getModel(ctx.input.projectId, ctx.input.modelId);

    let featureImpact: any[] | undefined;
    if (ctx.input.includeFeatureImpact) {
      try {
        let impact = await client.getFeatureImpact(ctx.input.projectId, ctx.input.modelId);
        featureImpact = (impact.featureImpacts || impact || []).map((f: any) => ({
          featureName: f.featureName,
          impactNormalized: f.impactNormalized,
          impactUnnormalized: f.impactUnnormalized,
          redundantWith: f.redundantWith
        }));
      } catch (err: any) {
        ctx.warn(`Could not retrieve feature impact: ${err.message || 'Not yet computed'}`);
      }
    }

    return {
      output: {
        modelId: model.id || model.modelId,
        modelType: model.modelType,
        modelCategory: model.modelCategory,
        blueprintId: model.blueprintId,
        samplePct: model.samplePct,
        trainingRowCount: model.trainingRowCount,
        isFrozen: model.isFrozen,
        metrics: model.metrics,
        featureImpact
      },
      message: `Model **${model.modelType}** (${model.id || model.modelId}) with ${model.samplePct ? `${model.samplePct}% sample` : 'full dataset'}.`
    };
  })
  .build();
