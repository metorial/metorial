import { SlateTool } from 'slates';
import { z } from 'zod';
import { StoryblokClient } from '../lib/client';
import { spec } from '../spec';

export let listStories = SlateTool.create(spec, {
  name: 'List Stories',
  key: 'list_stories',
  description: `Search and list content stories in the space. Filter by slug, tag, component type, publication status, workflow stage, or language. Supports pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (default: 1)'),
      perPage: z
        .number()
        .optional()
        .describe('Number of stories per page (default: 25, max: 100)'),
      searchTerm: z.string().optional().describe('Search term to filter stories by name'),
      sortBy: z
        .string()
        .optional()
        .describe('Field to sort by, e.g. "created_at:desc", "name:asc", "published_at:desc"'),
      withTag: z.string().optional().describe('Filter by tag name'),
      startsWith: z
        .string()
        .optional()
        .describe('Filter by full_slug prefix, e.g. "blog/" for all blog stories'),
      containComponent: z
        .string()
        .optional()
        .describe('Filter by component name used in content'),
      isPublished: z.boolean().optional().describe('Filter by publication status'),
      language: z.string().optional().describe('Language code to filter by'),
      byUuids: z
        .string()
        .optional()
        .describe('Comma-separated UUIDs to fetch specific stories')
    })
  )
  .output(
    z.object({
      stories: z
        .array(
          z.object({
            storyId: z.number().optional().describe('Numeric ID of the story'),
            uuid: z.string().optional().describe('UUID of the story'),
            name: z.string().optional().describe('Name of the story'),
            slug: z.string().optional().describe('Slug of the story'),
            fullSlug: z.string().optional().describe('Full slug path'),
            published: z.boolean().optional().describe('Whether the story is published'),
            isFolder: z.boolean().optional().describe('Whether the story is a folder'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            publishedAt: z.string().optional().describe('Publication timestamp'),
            tagList: z.array(z.string()).optional().describe('Tags assigned to the story')
          })
        )
        .describe('List of stories'),
      total: z.number().describe('Total number of stories matching the query')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StoryblokClient({
      token: ctx.auth.token,
      region: ctx.auth.region,
      spaceId: ctx.config.spaceId
    });

    let result = await client.listStories({
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      searchTerm: ctx.input.searchTerm,
      sortBy: ctx.input.sortBy,
      withTag: ctx.input.withTag,
      startsWith: ctx.input.startsWith,
      containComponent: ctx.input.containComponent,
      isPublished: ctx.input.isPublished,
      language: ctx.input.language,
      byUuids: ctx.input.byUuids
    });

    let stories = result.stories.map(s => ({
      storyId: s.id,
      uuid: s.uuid,
      name: s.name,
      slug: s.slug,
      fullSlug: s.full_slug,
      published: s.published,
      isFolder: s.is_folder,
      createdAt: s.created_at,
      publishedAt: s.published_at,
      tagList: s.tag_list
    }));

    return {
      output: { stories, total: result.total },
      message: `Found **${result.total}** stories (showing ${stories.length}).`
    };
  })
  .build();
