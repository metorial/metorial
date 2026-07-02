import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let runInferenceTool = SlateTool.create(spec, {
  name: 'Run Inference',
  key: 'run_inference',
  description: `Run predictions on an image using a trained model deployed on the Roboflow hosted inference API. Provide a publicly accessible image URL or base64-encoded image data. Returns detected objects with bounding boxes, confidence scores, and class labels.`,
  instructions: [
    'The model must be trained and deployed before running inference.',
    'Confidence is specified as a percentage (0-100), not a decimal.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('Project URL slug'),
      versionNumber: z.number().describe('Model version number'),
      imageSource: z
        .string()
        .describe('Publicly accessible image URL or base64-encoded image data'),
      confidence: z
        .number()
        .optional()
        .describe('Minimum confidence threshold (0-100, default 40)'),
      overlap: z
        .number()
        .optional()
        .describe(
          'Maximum bounding box overlap percentage before merging (0-100, default 30)'
        ),
      classes: z
        .string()
        .optional()
        .describe('Comma-separated list of class names to filter predictions')
    })
  )
  .output(
    z.object({
      predictions: z
        .array(
          z.object({
            className: z.string().describe('Detected class name'),
            confidence: z.number().describe('Prediction confidence (0-1)'),
            x: z.number().describe('Bounding box center X coordinate'),
            y: z.number().describe('Bounding box center Y coordinate'),
            width: z.number().describe('Bounding box width'),
            height: z.number().describe('Bounding box height')
          })
        )
        .describe('List of predictions/detections'),
      imageWidth: z.number().optional().describe('Width of the input image'),
      imageHeight: z.number().optional().describe('Height of the input image')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);

    let result = await client.runInference(
      ctx.input.projectId,
      ctx.input.versionNumber,
      ctx.input.imageSource,
      {
        confidence: ctx.input.confidence,
        overlap: ctx.input.overlap,
        classes: ctx.input.classes
      }
    );

    let predictions = (result.predictions || []).map((p: any) => ({
      className: p.class,
      confidence: p.confidence,
      x: p.x,
      y: p.y,
      width: p.width,
      height: p.height
    }));

    return {
      output: {
        predictions,
        imageWidth: result.image?.width,
        imageHeight: result.image?.height
      },
      message: `Detected **${predictions.length}** object(s). ${predictions.length > 0 ? `Classes: ${[...new Set(predictions.map((p: any) => p.className))].join(', ')}.` : ''}`
    };
  })
  .build();
