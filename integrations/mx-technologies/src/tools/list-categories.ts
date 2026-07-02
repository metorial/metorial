import { SlateTool } from 'slates';
import { z } from 'zod';
import { MxClient } from '../lib/client';
import { spec } from '../spec';

let categorySchema = z.object({
  guid: z.string().optional().describe('MX-assigned unique identifier'),
  name: z.string().optional().nullable().describe('Category name'),
  parentGuid: z
    .string()
    .optional()
    .nullable()
    .describe('Parent category GUID for subcategories'),
  isDefault: z
    .boolean()
    .optional()
    .nullable()
    .describe('Whether this is an MX default category'),
  isIncome: z
    .boolean()
    .optional()
    .nullable()
    .describe('Whether the category represents income'),
  metadata: z.string().optional().nullable().describe('Custom metadata'),
  createdAt: z.string().optional().nullable().describe('Creation timestamp'),
  updatedAt: z.string().optional().nullable().describe('Last update timestamp')
});

export let listCategories = SlateTool.create(spec, {
  name: 'List Categories',
  key: 'list_categories',
  description: `List transaction categories for a user including both MX default categories and custom categories. Useful for understanding how transactions are categorized and for building category-based reports.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userGuid: z
        .string()
        .optional()
        .describe('MX GUID of the user. If omitted, returns default MX categories.'),
      page: z.number().optional().describe('Page number'),
      recordsPerPage: z.number().optional().describe('Records per page (max: 100)')
    })
  )
  .output(
    z.object({
      categories: z.array(categorySchema),
      pagination: z
        .object({
          currentPage: z.number().optional(),
          perPage: z.number().optional(),
          totalEntries: z.number().optional(),
          totalPages: z.number().optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MxClient({ token: ctx.auth.token, environment: ctx.config.environment });

    let result: any;
    if (ctx.input.userGuid) {
      result = await client.listCategories(ctx.input.userGuid, {
        page: ctx.input.page,
        recordsPerPage: ctx.input.recordsPerPage
      });
    } else {
      result = await client.listDefaultCategories();
    }

    let categories = (result.categories || []).map((c: any) => ({
      guid: c.guid,
      name: c.name,
      parentGuid: c.parent_guid,
      isDefault: c.is_default,
      isIncome: c.is_income,
      metadata: c.metadata,
      createdAt: c.created_at,
      updatedAt: c.updated_at
    }));

    return {
      output: {
        categories,
        pagination: result.pagination
          ? {
              currentPage: result.pagination.current_page,
              perPage: result.pagination.per_page,
              totalEntries: result.pagination.total_entries,
              totalPages: result.pagination.total_pages
            }
          : undefined
      },
      message: `Found **${categories.length}** categories.`
    };
  })
  .build();
