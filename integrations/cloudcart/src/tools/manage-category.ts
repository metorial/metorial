import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageCategory = SlateTool.create(spec, {
  name: 'Manage Category',
  key: 'manage_category',
  description: `Create, update, or delete a product category. Use this to organize products into categories, build category hierarchies by setting parent categories, and manage SEO and display settings.`,
  instructions: [
    'To create a category, provide a name and set action to "create".',
    'To update a category, provide the categoryId and any fields to change with action "update".',
    'To delete a category, provide the categoryId with action "delete".'
  ]
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('The action to perform'),
      categoryId: z
        .string()
        .optional()
        .describe('ID of the category (required for update/delete)'),
      name: z.string().optional().describe('Category name (required for create)'),
      parentId: z.string().optional().describe('Parent category ID for building hierarchy'),
      description: z.string().optional().describe('Category description'),
      urlHandle: z.string().optional().describe('URL-friendly slug'),
      seoTitle: z.string().optional().describe('SEO title'),
      seoDescription: z.string().optional().describe('SEO meta description'),
      order: z.number().optional().describe('Display order'),
      color: z.string().optional().describe('Category color'),
      icon: z.string().optional().describe('Category icon')
    })
  )
  .output(
    z.object({
      categoryId: z.string().optional(),
      name: z.string().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.config.domain });

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw new Error('Name is required to create a category.');

      let attributes: Record<string, any> = { name: ctx.input.name };
      if (ctx.input.description !== undefined) attributes.description = ctx.input.description;
      if (ctx.input.urlHandle !== undefined) attributes.url_handle = ctx.input.urlHandle;
      if (ctx.input.seoTitle !== undefined) attributes.seo_title = ctx.input.seoTitle;
      if (ctx.input.seoDescription !== undefined)
        attributes.seo_description = ctx.input.seoDescription;
      if (ctx.input.order !== undefined) attributes.order = ctx.input.order;
      if (ctx.input.color !== undefined) attributes.color = ctx.input.color;
      if (ctx.input.icon !== undefined) attributes.icon = ctx.input.icon;
      if (ctx.input.parentId !== undefined) attributes.parent_id = ctx.input.parentId;

      let relationships: Record<string, any> | undefined;
      if (ctx.input.parentId) {
        relationships = {
          parent: {
            data: { type: 'categories', id: ctx.input.parentId }
          }
        };
      }

      let res = await client.createCategory(attributes, relationships);
      let c = res.data;
      return {
        output: { categoryId: c.id, name: c.attributes.name },
        message: `Created category **${c.attributes.name}** (ID: ${c.id}).`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.categoryId) throw new Error('Category ID is required for update.');

      let attributes: Record<string, any> = {};
      if (ctx.input.name !== undefined) attributes.name = ctx.input.name;
      if (ctx.input.description !== undefined) attributes.description = ctx.input.description;
      if (ctx.input.urlHandle !== undefined) attributes.url_handle = ctx.input.urlHandle;
      if (ctx.input.seoTitle !== undefined) attributes.seo_title = ctx.input.seoTitle;
      if (ctx.input.seoDescription !== undefined)
        attributes.seo_description = ctx.input.seoDescription;
      if (ctx.input.order !== undefined) attributes.order = ctx.input.order;
      if (ctx.input.color !== undefined) attributes.color = ctx.input.color;
      if (ctx.input.icon !== undefined) attributes.icon = ctx.input.icon;
      if (ctx.input.parentId !== undefined) attributes.parent_id = ctx.input.parentId;

      let res = await client.updateCategory(ctx.input.categoryId, attributes);
      let c = res.data;
      return {
        output: { categoryId: c.id, name: c.attributes.name },
        message: `Updated category **${c.attributes.name || c.id}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.categoryId) throw new Error('Category ID is required for delete.');
      await client.deleteCategory(ctx.input.categoryId);
      return {
        output: { deleted: true },
        message: `Deleted category **${ctx.input.categoryId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
