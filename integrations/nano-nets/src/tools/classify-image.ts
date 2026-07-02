import { SlateTool } from 'slates';
import { z } from 'zod';
import { NanonetsClient } from '../lib/client';
import { spec } from '../spec';

let classificationResultSchema = z.object({
  label: z.string().describe('Predicted category label'),
  probability: z.number().describe('Confidence probability for this category')
});

export let classifyImage = SlateTool.create(spec, {
  name: 'Classify Image',
  key: 'classify_image',
  description: `Classify images into predefined categories using a trained Nanonets image classification model. Provide one or more image URLs and receive category labels with probability scores.`,
  constraints: [
    'The classification model must be trained before running predictions.',
    'Minimum 25 images per category are needed for training.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      modelId: z.string().describe('ID of the trained classification model'),
      urls: z.array(z.string()).min(1).describe('URLs of images to classify')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            imageUrl: z.string().describe('URL of the classified image'),
            classifications: z
              .array(classificationResultSchema)
              .describe('Classification results sorted by probability')
          })
        )
        .describe('Classification results for each image')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NanonetsClient(ctx.auth.token);

    let result = await client.classifyByUrl(ctx.input.modelId, ctx.input.urls);

    let results = (result.result || []).map((r: any) => ({
      imageUrl: r.input || r.file || '',
      classifications: (r.prediction || [])
        .map((p: any) => ({
          label: p.label || p.category,
          probability: p.probability ?? p.score ?? 0
        }))
        .sort((a: any, b: any) => b.probability - a.probability)
    }));

    let topResults = results.map((r: any) => {
      let top = r.classifications[0];
      return top ? `"${top.label}" (${(top.probability * 100).toFixed(1)}%)` : 'no prediction';
    });

    return {
      output: {
        results
      },
      message: `Classified **${ctx.input.urls.length}** image(s). Top predictions: ${topResults.join(', ')}.`
    };
  })
  .build();
