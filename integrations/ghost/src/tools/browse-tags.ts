import { SlateTool } from 'slates';
import { z } from 'zod';
import { getClient } from '../lib/client';
import { pagination } from '../lib/schemas';
import { spec } from '../spec';

let tagSchema = z
  .object({
    tagId: z.string().describe('Unique tag ID'),
    name: z.string().optional().describe('Tag name'),
    slug: z.string().optional().describe('URL-friendly slug'),
    description: z.string().nullable().optional().describe('Tag description'),
    featureImage: z.string().nullable().optional().describe('Tag feature image URL'),
    visibility: z.string().optional().describe('Tag visibility (public or internal)'),
    metaTitle: z.string().nullable().optional().describe('SEO meta title'),
    metaDescription: z.string().nullable().optional().describe('SEO meta description'),
    postCount: z.number().optional().describe('Number of posts with this tag'),
    createdAt: z.string().optional().describe('Creation timestamp'),
    updatedAt: z.string().optional().describe('Last update timestamp'),
    url: z.string().optional().describe('Tag URL')
  })
  .partial()
  .required({ tagId: true });

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
      api: z
        .enum(['admin', 'content'])
        .optional()
        .describe(
          'Read through Admin or published Content API. Writes require Admin. Defaults to the connection type.'
        ),
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
    let client = getClient(ctx, ctx.input.api);

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
      description: t.description,
      featureImage: t.feature_image,
      visibility: t.visibility,
      metaTitle: t.meta_title,
      metaDescription: t.meta_description,
      postCount: t.count?.posts,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
      url: t.url
    }));

    let pageInfo = pagination(result, tags.length);

    return {
      output: { tags, pagination: pageInfo },
      message: `Found **${pageInfo.total}** tags (page ${pageInfo.page} of ${pageInfo.pages}).`
    };
  })
  .build();
