import { SlateTool } from 'slates';
import { z } from 'zod';
import { VimeoClient } from '../lib/client';
import {
  mapVideo,
  paginationInputSchema,
  paginationOutputSchema,
  videoSchema
} from '../lib/schemas';
import { spec } from '../spec';

let categorySchema = z.object({
  categoryName: z.string().describe('Category identifier/slug'),
  uri: z.string().describe('URI of the category resource'),
  name: z.string().describe('Display name of the category'),
  link: z.string().describe('URL of the category on Vimeo'),
  topLevel: z.boolean().optional().describe('Whether this is a top-level category'),
  pictureUrl: z.string().nullable().optional().describe('URL of the category image')
});

let mapCategory = (c: any) => ({
  categoryName: c.uri?.replace('/categories/', '') ?? '',
  uri: c.uri ?? '',
  name: c.name ?? '',
  link: c.link ?? '',
  topLevel: c.top_level ?? undefined,
  pictureUrl: c.pictures?.sizes?.[c.pictures.sizes.length - 1]?.link ?? null
});

export let listCategoriesTool = SlateTool.create(spec, {
  name: 'List Categories',
  key: 'list_categories',
  description: `List all top-level video categories on Vimeo. Categories define genres that videos belong to.`,
  tags: {
    readOnly: true
  }
})
  .input(paginationInputSchema)
  .output(
    paginationOutputSchema.extend({
      categories: z.array(categorySchema).describe('List of categories')
    })
  )
  .handleInvocation(async ctx => {
    let client = new VimeoClient(ctx.auth.token);
    let result = await client.listCategories({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let categories = (result.data ?? []).map(mapCategory);

    return {
      output: {
        total: result.total ?? 0,
        page: result.page ?? 1,
        perPage: result.perPage ?? categories.length,
        categories
      },
      message: `Found **${result.total ?? categories.length}** categories`
    };
  })
  .build();

export let listCategoryVideosTool = SlateTool.create(spec, {
  name: 'List Category Videos',
  key: 'list_category_videos',
  description: `List videos in a specific category on Vimeo. Browse videos by genre.`,
  tags: {
    readOnly: true
  }
})
  .input(
    paginationInputSchema.extend({
      categoryName: z
        .string()
        .describe('The category slug/identifier (e.g. "animation", "music")'),
      sort: z
        .enum([
          'alphabetical',
          'comments',
          'date',
          'duration',
          'featured',
          'likes',
          'plays',
          'relevant'
        ])
        .optional()
        .describe('Sort order for the results')
    })
  )
  .output(
    paginationOutputSchema.extend({
      videos: z.array(videoSchema).describe('List of videos in the category')
    })
  )
  .handleInvocation(async ctx => {
    let client = new VimeoClient(ctx.auth.token);
    let result = await client.getCategoryVideos(ctx.input.categoryName, {
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      sort: ctx.input.sort
    });

    let videos = (result.data ?? []).map(mapVideo);

    return {
      output: {
        total: result.total ?? 0,
        page: result.page ?? 1,
        perPage: result.perPage ?? videos.length,
        videos
      },
      message: `Found **${result.total ?? videos.length}** videos in category "${ctx.input.categoryName}"`
    };
  })
  .build();
