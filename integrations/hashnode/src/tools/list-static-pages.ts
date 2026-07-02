import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listStaticPages = SlateTool.create(spec, {
  name: 'List Static Pages',
  key: 'list_static_pages',
  description: `List static pages in the configured publication (e.g. About, Contact). Returns page content in both Markdown and HTML. Optionally retrieve a single page by slug.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      slug: z
        .string()
        .optional()
        .describe(
          'If provided, retrieve a single static page by its slug instead of listing all'
        ),
      first: z
        .number()
        .optional()
        .default(10)
        .describe('Number of pages to return when listing'),
      after: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      staticPage: z
        .object({
          pageId: z.string(),
          title: z.string().nullable().optional(),
          slug: z.string().nullable().optional(),
          hidden: z.boolean().nullable().optional(),
          contentMarkdown: z.string().nullable().optional(),
          contentHtml: z.string().nullable().optional()
        })
        .nullable()
        .optional()
        .describe('Single page — returned when slug is provided'),
      staticPages: z
        .array(
          z.object({
            pageId: z.string(),
            title: z.string().nullable().optional(),
            slug: z.string().nullable().optional(),
            hidden: z.boolean().nullable().optional(),
            contentMarkdown: z.string().nullable().optional(),
            contentHtml: z.string().nullable().optional()
          })
        )
        .nullable()
        .optional()
        .describe('List of pages'),
      hasNextPage: z.boolean().optional(),
      endCursor: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      publicationHost: ctx.config.publicationHost
    });

    if (ctx.input.slug) {
      let page = await client.getStaticPageBySlug(ctx.input.slug);
      if (!page) throw new Error('Static page not found');

      return {
        output: {
          staticPage: {
            pageId: page.id,
            title: page.title,
            slug: page.slug,
            hidden: page.hidden,
            contentMarkdown: page.content?.markdown,
            contentHtml: page.content?.html
          }
        },
        message: `Retrieved static page **"${page.title}"**`
      };
    }

    let result = await client.listStaticPages({
      first: Math.min(ctx.input.first, 20),
      after: ctx.input.after
    });

    let staticPages = result.staticPages.map((p: any) => ({
      pageId: p.id,
      title: p.title,
      slug: p.slug,
      hidden: p.hidden,
      contentMarkdown: p.content?.markdown,
      contentHtml: p.content?.html
    }));

    return {
      output: {
        staticPages,
        hasNextPage: result.pageInfo?.hasNextPage ?? false,
        endCursor: result.pageInfo?.endCursor
      },
      message: `Found **${staticPages.length}** static pages`
    };
  })
  .build();
