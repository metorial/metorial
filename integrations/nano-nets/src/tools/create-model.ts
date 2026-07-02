import { SlateTool } from 'slates';
import { z } from 'zod';
import { NanonetsClient } from '../lib/client';
import { spec } from '../spec';

export let createModel = SlateTool.create(spec, {
  name: 'Create Model',
  key: 'create_model',
  description: `Create a new AI model in Nanonets. Supports OCR document extraction, image classification, and object detection model types. Define the categories or fields you want the model to recognize.`,
  instructions: [
    'For OCR models, categories represent the field names you want to extract (e.g., "invoice_number", "total_amount").',
    'For classification models, categories represent the labels to classify images into (e.g., "cat", "dog"). Minimum 2 categories required.',
    'For object detection models, categories represent the object types to detect in images.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      modelType: z
        .enum(['ocr', 'image_classification', 'object_detection'])
        .describe('Type of AI model to create'),
      categories: z
        .array(z.string())
        .min(1)
        .describe('List of category/field names for the model to recognize')
    })
  )
  .output(
    z.object({
      modelId: z.string().describe('Unique identifier of the created model'),
      modelType: z.string().describe('Type of the model created'),
      state: z
        .number()
        .describe('Current state of the model (0 = created, needs training data)'),
      categories: z
        .array(
          z.object({
            name: z.string().describe('Category name'),
            count: z.number().optional().describe('Number of training samples')
          })
        )
        .describe('Configured categories for the model')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NanonetsClient(ctx.auth.token);

    let result: any;

    if (ctx.input.modelType === 'ocr') {
      result = await client.createOcrModel(ctx.input.categories);
    } else if (ctx.input.modelType === 'image_classification') {
      result = await client.createClassificationModel(ctx.input.categories);
    } else {
      result = await client.createObjectDetectionModel(ctx.input.categories);
    }

    let categories = (result.categories || []).map((c: any) => ({
      name: c.name || c,
      count: c.count ?? 0
    }));

    return {
      output: {
        modelId: result.model_id,
        modelType: result.model_type || ctx.input.modelType,
        state: result.state ?? 0,
        categories
      },
      message: `Created **${ctx.input.modelType}** model with ID \`${result.model_id}\` and ${ctx.input.categories.length} categories: ${ctx.input.categories.join(', ')}.`
    };
  })
  .build();
