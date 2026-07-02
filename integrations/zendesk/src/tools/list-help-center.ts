import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ZendeskClient } from '../lib/client';
import { spec } from '../spec';

export let listHelpCenterCategories = SlateTool.create(spec, {
  name: 'List Help Center Categories',
  key: 'list_help_center_categories',
  description: `Lists Help Center categories and sections. Categories are the top-level containers, and sections organize articles within categories. Useful for understanding the knowledge base structure before creating or managing articles.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().default(1).describe('Page number'),
      perPage: z.number().optional().default(25).describe('Results per page')
    })
  )
  .output(
    z.object({
      categories: z.array(
        z.object({
          categoryId: z.string(),
          name: z.string(),
          description: z.string().nullable(),
          locale: z.string(),
          position: z.number().nullable(),
          htmlUrl: z.string().nullable(),
          createdAt: z.string(),
          updatedAt: z.string()
        })
      ),
      sections: z.array(
        z.object({
          sectionId: z.string(),
          name: z.string(),
          description: z.string().nullable(),
          categoryId: z.string().nullable(),
          locale: z.string(),
          position: z.number().nullable(),
          htmlUrl: z.string().nullable(),
          createdAt: z.string(),
          updatedAt: z.string()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZendeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType
    });

    let [catData, secData] = await Promise.all([
      client.listCategories({ page: ctx.input.page, perPage: ctx.input.perPage }),
      client.listSections({ page: ctx.input.page, perPage: ctx.input.perPage })
    ]);

    let categories = (catData.categories || []).map((c: any) => ({
      categoryId: String(c.id),
      name: c.name,
      description: c.description || null,
      locale: c.locale,
      position: c.position ?? null,
      htmlUrl: c.html_url || null,
      createdAt: c.created_at,
      updatedAt: c.updated_at
    }));

    let sections = (secData.sections || []).map((s: any) => ({
      sectionId: String(s.id),
      name: s.name,
      description: s.description || null,
      categoryId: s.category_id ? String(s.category_id) : null,
      locale: s.locale,
      position: s.position ?? null,
      htmlUrl: s.html_url || null,
      createdAt: s.created_at,
      updatedAt: s.updated_at
    }));

    return {
      output: { categories, sections },
      message: `Found ${categories.length} category(ies) and ${sections.length} section(s)`
    };
  })
  .build();
