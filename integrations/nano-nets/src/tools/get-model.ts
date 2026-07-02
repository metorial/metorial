import { SlateTool } from 'slates';
import { z } from 'zod';
import { NanonetsClient } from '../lib/client';
import { spec } from '../spec';

export let getModel = SlateTool.create(spec, {
  name: 'Get Model',
  key: 'get_model',
  description: `Retrieve details about a Nanonets model including its current state, configured categories, and training status. Works for OCR, image classification, and object detection models.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      modelId: z.string().describe('Unique identifier of the model'),
      modelType: z
        .enum(['ocr', 'image_classification'])
        .default('ocr')
        .describe('Type of the model to retrieve')
    })
  )
  .output(
    z.object({
      modelId: z.string().describe('Unique identifier of the model'),
      modelType: z.string().describe('Type of the model'),
      state: z
        .number()
        .describe(
          'Current state (0=created, 1=data uploaded, 2=annotated, 3+=trained/hosted)'
        ),
      categories: z
        .array(
          z.object({
            name: z.string().describe('Category name'),
            count: z.number().optional().describe('Number of training samples')
          })
        )
        .describe('Configured categories')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NanonetsClient(ctx.auth.token);

    let result: any;
    if (ctx.input.modelType === 'image_classification') {
      result = await client.getClassificationModel(ctx.input.modelId);
    } else {
      result = await client.getOcrModel(ctx.input.modelId);
    }

    let categories = (result.categories || []).map((c: any) => ({
      name: c.name || c,
      count: c.count ?? 0
    }));

    let stateLabels: Record<number, string> = {
      0: 'Created (no training data)',
      1: 'Training data uploaded',
      2: 'Data annotated',
      3: 'Trained/Hosted'
    };

    let stateLabel = stateLabels[result.state] || `State ${result.state}`;

    return {
      output: {
        modelId: result.model_id,
        modelType: result.model_type || ctx.input.modelType,
        state: result.state ?? 0,
        categories
      },
      message: `Model \`${result.model_id}\` is in state: **${stateLabel}** with ${categories.length} categories.`
    };
  })
  .build();
