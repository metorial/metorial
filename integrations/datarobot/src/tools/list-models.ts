import { SlateTool } from 'slates';
import { z } from 'zod';
import { DataRobotClient } from '../lib/client';
import { parseOutput } from '../lib/output';
import { spec } from '../spec';

let modelSchema = z.object({
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
  isStarred: z.boolean().optional().describe('Whether the model is starred'),
  metrics: z.record(z.string(), z.any()).optional().describe('Model performance metrics')
});

let outputSchema = z.object({
  models: z.array(modelSchema).describe('List of trained models')
});

export let listModels = SlateTool.create(spec, {
  name: 'List Models',
  key: 'list_models',
  description: `List trained models in a DataRobot project. Returns model types, training details, and performance metrics from the leaderboard.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to list models for'),
      offset: z.number().optional().describe('Pagination offset'),
      limit: z.number().optional().describe('Maximum number of models to return'),
      orderBy: z
        .string()
        .optional()
        .describe('Sort field (e.g. "metric" for best performing first)')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let client = new DataRobotClient({
      token: ctx.auth.token,
      endpointUrl: ctx.auth.endpointUrl ?? ctx.config.endpointUrl
    });

    let models = await client.listModels(ctx.input.projectId, {
      offset: ctx.input.offset,
      limit: ctx.input.limit,
      orderBy: ctx.input.orderBy
    });

    let mapped = models.map((m: any) => ({
      raw: m,
      modelId: m.id ?? m.modelId,
      modelType: m.modelType,
      modelCategory: m.modelCategory,
      blueprintId: m.blueprintId,
      samplePct: m.samplePct,
      trainingRowCount: m.trainingRowCount,
      isFrozen: m.isFrozen,
      isStarred: m.isStarred,
      metrics: m.metrics
    }));

    return {
      output: parseOutput(outputSchema, { models: mapped }),
      message: `Found **${mapped.length}** model(s) in the project leaderboard.`
    };
  })
  .build();
