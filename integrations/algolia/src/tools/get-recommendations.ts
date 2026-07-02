import { SlateTool } from 'slates';
import { z } from 'zod';
import { AlgoliaClient } from '../lib/client';
import { spec } from '../spec';

let recommendationRequestSchema = z.object({
  indexName: z.string().describe('Name of the Algolia index to get recommendations from'),
  model: z
    .enum([
      'related-products',
      'bought-together',
      'trending-items',
      'trending-facets',
      'looking-similar'
    ])
    .describe('The recommendation model to use'),
  objectID: z
    .string()
    .optional()
    .describe(
      'The objectID of the item to get recommendations for (required for related-products, bought-together, and looking-similar models)'
    ),
  threshold: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe('Minimum score threshold for recommendations (0-100)'),
  maxRecommendations: z
    .number()
    .optional()
    .describe('Maximum number of recommendations to return'),
  queryParameters: z
    .record(z.string(), z.any())
    .optional()
    .describe(
      'Additional query parameters for filtering recommendations (e.g., filters, facetFilters)'
    ),
  facetName: z
    .string()
    .optional()
    .describe('Facet attribute name (required for trending-facets model)'),
  facetValue: z
    .string()
    .optional()
    .describe('Facet value to get trending facets for (used with trending-facets model)')
});

export let getRecommendations = SlateTool.create(spec, {
  name: 'Get Recommendations',
  key: 'get_recommendations',
  description: `Get personalized recommendations from Algolia Recommend. Supports multiple recommendation models including related products, frequently bought together, trending items, trending facets, and visually similar items. Multiple recommendation requests can be batched in a single call.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      requests: z
        .array(recommendationRequestSchema)
        .describe('Array of recommendation requests to execute in a single batch')
    })
  )
  .output(
    z.object({
      results: z
        .array(z.any())
        .describe('Array of recommendation result objects, one per request')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AlgoliaClient({
      applicationId: ctx.auth.applicationId,
      token: ctx.auth.token,
      analyticsRegion: ctx.config.analyticsRegion
    });

    let requests = ctx.input.requests.map(req => {
      let payload: Record<string, any> = {
        indexName: req.indexName,
        model: req.model
      };

      if (req.objectID !== undefined) {
        payload.objectID = req.objectID;
      }

      if (req.threshold !== undefined) {
        payload.threshold = req.threshold;
      }

      if (req.maxRecommendations !== undefined) {
        payload.maxRecommendations = req.maxRecommendations;
      }

      if (req.queryParameters !== undefined) {
        payload.queryParameters = req.queryParameters;
      }

      if (req.facetName !== undefined) {
        payload.facetName = req.facetName;
      }

      if (req.facetValue !== undefined) {
        payload.facetValue = req.facetValue;
      }

      return payload;
    });

    let result = await client.getRecommendations(requests);

    let totalHits = (result.results || []).reduce(
      (sum: number, r: any) => sum + (r.hits?.length ?? 0),
      0
    );

    return {
      output: {
        results: result.results || []
      },
      message: `Retrieved **${totalHits}** total recommendations across **${requests.length}** request(s).`
    };
  })
  .build();
