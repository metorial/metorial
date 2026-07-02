import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { WebflowClient } from '../lib/client';
import { spec } from '../spec';

export let updatePageSettings = SlateTool.create(spec, {
  name: 'Update Page Settings',
  key: 'update_page_settings',
  description: `Update a page's metadata including title, slug, SEO settings, and Open Graph properties. Only the fields you provide will be updated.`
})
  .input(
    z.object({
      pageId: z.string().describe('Unique identifier of the page to update'),
      localeId: z
        .string()
        .optional()
        .describe('Optional locale ID for localized page metadata'),
      title: z.string().optional().describe('New page title'),
      slug: z.string().optional().describe('New URL slug for the page'),
      description: z.string().optional().describe('Convenience alias for seo.description'),
      seo: z
        .object({
          title: z.string().optional().describe('SEO title tag'),
          description: z.string().optional().describe('SEO meta description')
        })
        .optional()
        .describe('SEO settings to update'),
      openGraph: z
        .object({
          title: z.string().optional().describe('Open Graph title'),
          description: z.string().optional().describe('Open Graph description'),
          titleCopied: z.boolean().optional(),
          descriptionCopied: z.boolean().optional()
        })
        .optional()
        .describe('Open Graph settings to update')
    })
  )
  .output(
    z.object({
      pageId: z.string().describe('ID of the updated page'),
      title: z.string().optional().describe('Updated page title'),
      slug: z.string().optional().describe('Updated URL slug'),
      description: z.string().optional().describe('Updated description')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WebflowClient(ctx.auth.token);
    let { pageId, localeId, title, slug, description, seo, openGraph } = ctx.input;

    let body: {
      title?: string;
      slug?: string;
      seo?: { title?: string; description?: string };
      openGraph?: {
        title?: string;
        description?: string;
        titleCopied?: boolean;
        descriptionCopied?: boolean;
      };
    } = {};

    if (title !== undefined) body.title = title;
    if (slug !== undefined) body.slug = slug;
    if (seo !== undefined || description !== undefined) {
      body.seo = seo ? { ...seo } : {};
      if (description !== undefined && body.seo.description === undefined) {
        body.seo.description = description;
      }
    }
    if (openGraph !== undefined) body.openGraph = openGraph;

    if (Object.keys(body).length === 0) {
      throw createApiServiceError('Provide at least one page setting to update.');
    }

    let page = await client.updatePageSettings(pageId, body, { localeId });

    return {
      output: {
        pageId: page.id ?? pageId,
        title: page.title,
        slug: page.slug,
        description: page.seo?.description ?? page.description
      },
      message: `Updated page settings for **${page.title ?? pageId}**.`
    };
  })
  .build();
