import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { paginationSchema, photoSchema, videoSchema } from '../lib/schemas';
import { spec } from '../spec';

let collectionMediaItemSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('photo'),
    photo: photoSchema
  }),
  z.object({
    type: z.literal('video'),
    video: videoSchema
  })
]);

export let getCollectionMedia = SlateTool.create(spec, {
  name: 'Get Collection Media',
  key: 'get_collection_media',
  description: `Retrieve all media (photos and videos) within a specific Pexels collection. You can filter to receive only photos or only videos, and control the sort order.`,
  constraints: [
    'Rate limited to 200 requests per hour.',
    'Maximum 80 results per page.',
    'Only accessible for featured collections or your own collections.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      collectionId: z.string().describe('The ID of the collection to retrieve media from'),
      mediaType: z
        .enum(['photos', 'videos'])
        .optional()
        .describe(
          'Filter to only receive photos or videos. If omitted, all media is returned.'
        ),
      sort: z
        .enum(['asc', 'desc'])
        .optional()
        .describe('Sort order for the media. Default: asc'),
      page: z.number().optional().describe('Page number. Default: 1'),
      perPage: z.number().optional().describe('Results per page. Default: 15, Max: 80')
    })
  )
  .output(
    z.object({
      collectionId: z.string().describe('The ID of the collection'),
      media: z
        .array(collectionMediaItemSchema)
        .describe('List of media items (photos and/or videos)'),
      pagination: paginationSchema.describe('Pagination information')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getCollectionMedia(ctx.input.collectionId, {
      type: ctx.input.mediaType,
      sort: ctx.input.sort,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    return {
      output: result,
      message: `Retrieved **${result.media.length}** media items from collection **${ctx.input.collectionId}** (page ${result.pagination.page}).`
    };
  })
  .build();
