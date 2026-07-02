import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import {
  apiClassSchema,
  createIfsClient,
  projectionSummarySchema,
  skipTokenSchema,
  topSchema
} from './common';

export let listApiProjections = SlateTool.create(spec, {
  name: 'List API Projections',
  key: 'list_api_projections',
  description:
    'Discover IFS Cloud projection APIs enabled for the tenant before choosing projection names for OpenAPI export or record queries.',
  instructions: [
    'Use this tool first when the projection name is unknown.',
    'IFS tenants can expose different projection names by release, license, and admin configuration.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      apiClass: apiClassSchema,
      nameContains: z
        .string()
        .optional()
        .describe(
          'Optional case-insensitive text filter applied to projection names/descriptions.'
        ),
      category: z
        .string()
        .optional()
        .describe(
          'Optional exact IFS projection category for AllProjections filtering. Defaults from apiClass, or Integration when omitted.'
        ),
      top: topSchema,
      skipToken: skipTokenSchema
    })
  )
  .output(
    z.object({
      projections: z.array(projectionSummarySchema),
      count: z.number(),
      nextPageToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createIfsClient(ctx);
    let result = await client.listApiProjections(ctx.input);

    return {
      output: {
        projections: result.projections,
        count: result.projections.length,
        nextPageToken: result.nextPageToken
      },
      message: `Found **${result.projections.length}** IFS projection(s).`
    };
  })
  .build();
