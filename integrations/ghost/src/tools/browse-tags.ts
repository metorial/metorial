import { SlateTool } from 'slates';
import { z } from 'zod';
import { GhostAdminClient } from '../lib/client';
import { spec } from '../spec';

let tagSchema = z.object({
  tagId: z.string().describe('Unique tag ID'),
  name: z.string().describe('Tag name'),
  slug: z.string().describe('URL-friendly slug'),
  description: z.string().nullable().describe('Tag description'),
  featureImage: z.string().nullable().describe('Tag feature image URL'),
  visibility: z.string().describe('Tag visibility (public or internal)'),
  metaTitle: z.string().nullable().describe('SEO meta title'),
  metaDescription: z.string().nullable().describe('SEO meta description'),
  postCount: z.number().optional().describe('Number of posts with this tag'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp'),
  url: z.string().describe('Tag URL')
});

let paginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  pages: z.number(),
  total: z.number(),
  next: z.number().nullable(),
  prev: z.number().nullable()
});

export let browseTags = SlateTool.create(spec, {
  name: 'Browse Tags',
  key: 'browse_tags',
  description: `List tags from your Ghost site. Tags are used to organize posts and pages. Use **include** with \`count.posts\` to see how many posts each tag has.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      filter: z
        .string()
        .optional()
        .describe('Ghost NQL filter expression (e.g., "visibility:public")'),
      include: z.string().optional().describe('Include related data (e.g., "count.posts")'),
      limit: z.number().optional().describe('Number of tags per page (default 15)'),
      page: z.number().optional().describe('Page number for pagination'),
      order: z.string().optional().describe('Sort order (e.g., "name asc")')
    })
  )
  .output(
    z.object({
      tags: z.array(tagSchema).describe('List of tags'),
      pagination: paginationSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = new GhostAdminClient({
      domain: ctx.config.adminDomain,
      apiKey: ctx.auth.token
    });

    let result = await client.browseTags({
      filter: ctx.input.filter,
      include: ctx.input.include,
      limit: ctx.input.limit,
      page: ctx.input.page,
      order: ctx.input.order
    });

    let tags = (result.tags ?? []).map((t: any) => ({
      tagId: t.id,
      name: t.name,
      slug: t.slug,
      description: t.description ?? null,
      featureImage: t.feature_image ?? null,
      visibility: t.visibility,
      metaTitle: t.meta_title ?? null,
      metaDescription: t.meta_description ?? null,
      postCount: t.count?.posts,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
      url: t.url
    }));

    let pagination = result.meta?.pagination ?? {
      page: 1,
      limit: 15,
      pages: 1,
      total: tags.length,
      next: null,
      prev: null
    };

    return {
      output: { tags, pagination },
      message: `Found **${pagination.total}** tags (page ${pagination.page} of ${pagination.pages}).`
    };
  })
  .build();
