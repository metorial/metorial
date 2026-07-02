import { SlateTool } from 'slates';
import { z } from 'zod';
import { VisionClient } from '../lib/client';
import { imageSourceSchema } from '../lib/schemas';
import { googleCloudVisionActionScopes } from '../scopes';
import { spec } from '../spec';

export let detectLabels = SlateTool.create(spec, {
  name: 'Detect Labels',
  key: 'detect_labels',
  description: `Identifies general objects, locations, activities, animal species, products, and more within an image. Returns descriptive labels with confidence scores. Useful for image categorization, content tagging, and understanding image contents at a high level.`,
  tags: {
    readOnly: true
  }
})
  .scopes(googleCloudVisionActionScopes.detectLabels)
  .input(
    z.object({
      image: imageSourceSchema,
      maxResults: z
        .number()
        .optional()
        .describe('Maximum number of labels to return (default: 10)')
    })
  )
  .output(
    z.object({
      labels: z.array(
        z.object({
          labelId: z.string().describe('Machine-generated identifier for the label'),
          name: z.string().describe('Human-readable label description'),
          confidence: z.number().describe('Confidence score between 0 and 1'),
          topicality: z.number().describe('Relevance of the label to the image')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new VisionClient({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let result = await client.annotateImage(ctx.input.image, [
      { type: 'LABEL_DETECTION', maxResults: ctx.input.maxResults ?? 10 }
    ]);

    let labels = (result.labelAnnotations ?? []).map(label => ({
      labelId: label.mid,
      name: label.description,
      confidence: label.score,
      topicality: label.topicality
    }));

    return {
      output: { labels },
      message:
        labels.length > 0
          ? `Detected **${labels.length}** labels: ${labels
              .slice(0, 5)
              .map(l => l.name)
              .join(', ')}${labels.length > 5 ? '...' : ''}`
          : 'No labels detected in the image.'
    };
  })
  .build();
