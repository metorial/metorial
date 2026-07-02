import { SlateTool } from 'slates';
import { z } from 'zod';
import { NanonetsClient } from '../lib/client';
import { spec } from '../spec';

export let trainModel = SlateTool.create(spec, {
  name: 'Train Model',
  key: 'train_model',
  description: `Initiate training for a Nanonets model. Supports OCR, image classification, and object detection models. Training data must be uploaded before training can start.`,
  instructions: [
    'Ensure training data has been uploaded and annotated before initiating training.',
    'Training typically takes approximately 2 hours. You will receive an email notification upon completion.',
    'For classification models, a minimum of 25 images per category is required.'
  ],
  constraints: [
    'Model must have training data uploaded before training can begin.',
    'Training takes approximately 2 hours to complete.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      modelId: z.string().describe('ID of the model to train'),
      modelType: z
        .enum(['ocr', 'image_classification', 'object_detection'])
        .default('ocr')
        .describe('Type of the model')
    })
  )
  .output(
    z.object({
      modelId: z.string().describe('ID of the model being trained'),
      state: z.number().describe('Updated model state after training initiation'),
      message: z.string().describe('Training status message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NanonetsClient(ctx.auth.token);

    let result: any;

    if (ctx.input.modelType === 'ocr') {
      result = await client.trainModel(ctx.input.modelId);
    } else if (ctx.input.modelType === 'image_classification') {
      result = await client.trainClassificationModel(ctx.input.modelId);
    } else {
      result = await client.trainObjectDetectionModel(ctx.input.modelId);
    }

    return {
      output: {
        modelId: result.model_id || ctx.input.modelId,
        state: result.state ?? 0,
        message: result.message || 'Training initiated'
      },
      message: `Training initiated for **${ctx.input.modelType}** model \`${ctx.input.modelId}\`. Training typically takes ~2 hours.`
    };
  })
  .build();
