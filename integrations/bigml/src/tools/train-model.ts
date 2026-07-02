import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let trainModel = SlateTool.create(spec, {
  name: 'Train Model',
  key: 'train_model',
  description: `Train a machine learning model from a dataset. Supports multiple model types: decision tree, ensemble (random forest, boosted trees), deepnet (neural network), logistic regression, linear regression, and time series.
Choose the model type based on your task — classification, regression, forecasting, etc.`,
  instructions: [
    'Provide a datasetId and select a modelType. The default "model" creates a decision tree.',
    'For ensembles, you can configure the number of models and optionally enable boosting or randomization.',
    'Use "deepnet" for complex classification/regression tasks requiring neural networks.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      datasetId: z
        .string()
        .describe('Dataset resource ID to train from (e.g., "dataset/abc123")'),
      modelType: z
        .enum([
          'model',
          'ensemble',
          'deepnet',
          'logisticregression',
          'linearregression',
          'timeseries'
        ])
        .default('model')
        .describe('Type of model to train'),
      name: z.string().optional().describe('Name for the model'),
      objectiveField: z.string().optional().describe('Field ID of the target/objective field'),
      inputFields: z
        .array(z.string())
        .optional()
        .describe('List of field IDs to use as predictors'),
      range: z
        .array(z.number())
        .optional()
        .describe('Row range [start, end] to use for training (1-indexed)'),
      numberOfModels: z
        .number()
        .optional()
        .describe('Number of models in an ensemble (only for ensemble type)'),
      boosting: z
        .object({
          iterations: z.number().optional().describe('Number of boosting iterations')
        })
        .optional()
        .describe('Enable gradient boosting for ensembles'),
      randomize: z.boolean().optional().describe('Enable random forests for ensembles'),
      numberOfHiddenLayers: z
        .number()
        .optional()
        .describe('Number of hidden layers (only for deepnet type)'),
      horizon: z.number().optional().describe('Forecast horizon (only for timeseries type)'),
      tags: z.array(z.string()).optional().describe('Tags to assign to the model'),
      projectId: z.string().optional().describe('Project to associate the model with')
    })
  )
  .output(
    z.object({
      resourceId: z.string().describe('BigML resource ID for the trained model'),
      name: z.string().optional().describe('Name of the model'),
      modelType: z.string().describe('Type of model created'),
      statusCode: z.number().describe('Status code'),
      statusMessage: z.string().describe('Status message'),
      created: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let body: Record<string, any> = {
      dataset: ctx.input.datasetId
    };

    if (ctx.input.name) body.name = ctx.input.name;
    if (ctx.input.objectiveField) body.objective_field = ctx.input.objectiveField;
    if (ctx.input.inputFields) body.input_fields = ctx.input.inputFields;
    if (ctx.input.range) body.range = ctx.input.range;
    if (ctx.input.tags) body.tags = ctx.input.tags;
    if (ctx.input.projectId) body.project = ctx.input.projectId;

    let modelType = ctx.input.modelType;

    if (modelType === 'ensemble') {
      if (ctx.input.numberOfModels) body.number_of_models = ctx.input.numberOfModels;
      if (ctx.input.boosting) body.boosting = ctx.input.boosting;
      if (ctx.input.randomize !== undefined) body.randomize = ctx.input.randomize;
    }

    if (modelType === 'deepnet' && ctx.input.numberOfHiddenLayers) {
      body.number_of_hidden_layers = ctx.input.numberOfHiddenLayers;
    }

    if (modelType === 'timeseries' && ctx.input.horizon) {
      body.horizon = ctx.input.horizon;
    }

    let result = await client.createResource(modelType, body);

    return {
      output: {
        resourceId: result.resource,
        name: result.name,
        modelType: modelType,
        statusCode: result.status?.code ?? result.code,
        statusMessage: result.status?.message ?? 'Created',
        created: result.created
      },
      message: `${modelType} **${result.resource}** created${result.name ? ` as "${result.name}"` : ''}. Status: ${result.status?.message ?? 'pending'}. Model training is asynchronous — check status with the Get Resource tool.`
    };
  })
  .build();
