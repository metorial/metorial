import { SlateTool } from 'slates';
import { z } from 'zod';
import { NanonetsClient } from '../lib/client';
import { nanonetsServiceError } from '../lib/errors';
import { spec } from '../spec';

export let uploadTrainingData = SlateTool.create(spec, {
  name: 'Upload Training Data',
  key: 'upload_training_data',
  description: `Upload training images via URL to a Nanonets model. Supports OCR, image classification, and object detection models. For classification models, images must be associated with a category. For OCR and object detection, annotations with bounding boxes can be provided.`,
  instructions: [
    'For OCR models: provide URLs and optional annotations as a JSON string with field names and bounding boxes.',
    'For classification models: provide URLs, a category label, and the images will be assigned to that category.',
    'For object detection: provide URLs and annotations as a JSON string with object names and bounding boxes.',
    'Annotation format for bounding boxes: [{"name": "field_name", "bndbox": {"xmin": 50, "ymin": 50, "xmax": 100, "ymax": 100}}]'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      modelId: z.string().describe('ID of the model to upload training data to'),
      modelType: z
        .enum(['ocr', 'image_classification', 'object_detection'])
        .default('ocr')
        .describe('Type of model'),
      urls: z.array(z.string()).min(1).describe('URLs of training images to upload'),
      category: z
        .string()
        .optional()
        .describe(
          'Category label for classification models (required for image_classification)'
        ),
      annotations: z
        .string()
        .optional()
        .describe(
          'JSON string of annotation data with bounding boxes (for OCR and object detection)'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the upload was successful'),
      modelId: z.string().describe('ID of the model that received training data'),
      uploadedCount: z.number().describe('Number of URLs uploaded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NanonetsClient(ctx.auth.token);

    if (ctx.input.modelType === 'image_classification') {
      if (!ctx.input.category) {
        throw nanonetsServiceError('Category is required for image classification models.');
      }
      await client.uploadClassificationTrainingUrls(
        ctx.input.modelId,
        ctx.input.category,
        ctx.input.urls
      );
    } else if (ctx.input.modelType === 'object_detection') {
      await client.uploadObjectDetectionTrainingUrls(
        ctx.input.modelId,
        ctx.input.urls,
        ctx.input.annotations || '[]'
      );
    } else {
      await client.uploadTrainingUrls(
        ctx.input.modelId,
        ctx.input.urls,
        ctx.input.annotations
      );
    }

    return {
      output: {
        success: true,
        modelId: ctx.input.modelId,
        uploadedCount: ctx.input.urls.length
      },
      message: `Uploaded **${ctx.input.urls.length}** training image(s) to **${ctx.input.modelType}** model \`${ctx.input.modelId}\`${ctx.input.category ? ` under category "${ctx.input.category}"` : ''}.`
    };
  })
  .build();
