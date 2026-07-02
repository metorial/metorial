import { SlateTool } from 'slates';
import { z } from 'zod';
import { VisionClient } from '../lib/client';
import { imageSourceSchema } from '../lib/schemas';
import { googleCloudVisionActionScopes } from '../scopes';
import { spec } from '../spec';

export let detectWeb = SlateTool.create(spec, {
  name: 'Detect Web Entities',
  key: 'detect_web',
  description: `Searches the web for information related to an image. Returns matching web entities, pages containing the image, visually similar images, and best-guess labels describing the image content. Useful for reverse image search, finding image sources, and understanding web presence.`,
  tags: {
    readOnly: true
  }
})
  .scopes(googleCloudVisionActionScopes.detectWeb)
  .input(
    z.object({
      image: imageSourceSchema,
      maxResults: z
        .number()
        .optional()
        .describe('Maximum number of web entities to return (default: 10)'),
      includeGeoResults: z
        .boolean()
        .optional()
        .describe('Include results derived from geo information in the image')
    })
  )
  .output(
    z.object({
      bestGuessLabels: z
        .array(
          z.object({
            label: z.string().describe('Best guess label for the image'),
            languageCode: z.string().optional().describe('Language code of the label')
          })
        )
        .describe('Best-guess labels describing the image content'),
      webEntities: z
        .array(
          z.object({
            entityId: z.string().describe('Web entity identifier'),
            name: z.string().describe('Description of the entity'),
            relevanceScore: z.number().describe('Relevance score of the entity')
          })
        )
        .describe('Web entities related to the image'),
      matchingPages: z
        .array(
          z.object({
            pageUrl: z.string().describe('URL of the matching page'),
            pageTitle: z.string().optional().describe('Title of the matching page')
          })
        )
        .describe('Web pages containing the image'),
      fullMatchingImageUrls: z
        .array(z.string())
        .describe('URLs of full-matching images found on the web'),
      partialMatchingImageUrls: z
        .array(z.string())
        .describe('URLs of partially matching images found on the web'),
      visuallySimilarImageUrls: z.array(z.string()).describe('URLs of visually similar images')
    })
  )
  .handleInvocation(async ctx => {
    let client = new VisionClient({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let imageContext = ctx.input.includeGeoResults
      ? { webDetectionParams: { includeGeoResults: ctx.input.includeGeoResults } }
      : undefined;

    let result = await client.annotateImage(
      ctx.input.image,
      [{ type: 'WEB_DETECTION', maxResults: ctx.input.maxResults ?? 10 }],
      imageContext
    );

    let web = result.webDetection;

    let bestGuessLabels = (web?.bestGuessLabels ?? []).map(l => ({
      label: l.label,
      languageCode: l.languageCode
    }));

    let webEntities = (web?.webEntities ?? []).map(e => ({
      entityId: e.entityId,
      name: e.description,
      relevanceScore: e.score
    }));

    let matchingPages = (web?.pagesWithMatchingImages ?? []).map(p => ({
      pageUrl: p.url,
      pageTitle: p.pageTitle
    }));

    let fullMatchingImageUrls = (web?.fullMatchingImages ?? []).map(i => i.url);
    let partialMatchingImageUrls = (web?.partialMatchingImages ?? []).map(i => i.url);
    let visuallySimilarImageUrls = (web?.visuallySimilarImages ?? []).map(i => i.url);

    return {
      output: {
        bestGuessLabels,
        webEntities,
        matchingPages,
        fullMatchingImageUrls,
        partialMatchingImageUrls,
        visuallySimilarImageUrls
      },
      message:
        bestGuessLabels.length > 0
          ? `Web detection complete — Best guess: **${bestGuessLabels.map(l => l.label).join(', ')}**. Found ${webEntities.length} entities, ${matchingPages.length} matching pages.`
          : `Web detection complete — Found ${webEntities.length} entities, ${matchingPages.length} matching pages.`
    };
  })
  .build();
