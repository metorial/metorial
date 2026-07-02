import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageInfotypeCategory = SlateTool.create(spec, {
  name: 'Manage Infotype Category',
  key: 'manage_infotype_category',
  description: `Create, retrieve, list, or delete infotype categories for organizing and grouping sensitive data types. Categories help classify discovered data (PII, PFI, PHI, etc.) into meaningful hierarchies.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'list', 'delete']).describe('Action to perform'),
      categoryLabel: z
        .string()
        .optional()
        .describe('Category label (required for create, get, delete)'),
      infotypes: z
        .array(z.string())
        .optional()
        .describe('List of infotype identifiers to include in the category'),
      page: z.number().optional().describe('Page number for listing'),
      size: z.number().optional().describe('Page size for listing'),
      sortBy: z.string().optional().describe('Field to sort by'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction')
    })
  )
  .output(
    z
      .object({
        category: z.any().optional().describe('Infotype category record'),
        categories: z.array(z.any()).optional().describe('List of infotype categories'),
        success: z.boolean().optional().describe('Whether the action succeeded')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let { action, categoryLabel } = ctx.input;

    switch (action) {
      case 'create': {
        if (!categoryLabel || !ctx.input.infotypes?.length) {
          throw new Error(
            'categoryLabel and infotypes are required for creating an infotype category'
          );
        }
        let result = await client.createInfotypeCategory({
          categoryLabel,
          infotypes: ctx.input.infotypes
        });
        let data = result?.data ?? result;
        return {
          output: { category: data, success: true },
          message: `Infotype category **${categoryLabel}** created with **${ctx.input.infotypes.length}** infotype(s).`
        };
      }
      case 'get': {
        if (!categoryLabel) throw new Error('categoryLabel is required for get action');
        let result = await client.getInfotypeCategory(categoryLabel);
        let data = result?.data ?? result;
        return {
          output: { category: data, success: true },
          message: `Retrieved infotype category **${categoryLabel}**.`
        };
      }
      case 'list': {
        let result = await client.listInfotypeCategories({
          page: ctx.input.page,
          size: ctx.input.size,
          sortBy: ctx.input.sortBy,
          sortOrder: ctx.input.sortOrder
        });
        let data = result?.data ?? result;
        let categories = Array.isArray(data) ? data : (data?.content ?? data?.items ?? []);
        return {
          output: { categories, success: true },
          message: `Found **${categories.length}** infotype category/ies.`
        };
      }
      case 'delete': {
        if (!categoryLabel) throw new Error('categoryLabel is required for delete action');
        await client.deleteInfotypeCategory(categoryLabel);
        return {
          output: { success: true },
          message: `Infotype category **${categoryLabel}** deleted.`
        };
      }
    }
  })
  .build();
