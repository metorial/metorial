import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { listMetadata, readList } from '../lib/responses';
import { spec } from '../spec';

export let manageInfotypeCategory = SlateTool.create(spec, {
  name: 'Manage Infotype Category',
  key: 'manage_infotype_category',
  description: `Create, retrieve, list, or delete infotype categories for organizing and grouping sensitive data types. Categories help classify discovered data (PII, PFI, PHI, etc.) into meaningful hierarchies.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      organisationId: z
        .number()
        .optional()
        .describe('Organisation ID from get_current_user. Omit to use the token default.'),
      action: z.enum(['create', 'get', 'list', 'delete']).describe('Action to perform'),
      categoryLabel: z
        .string()
        .optional()
        .describe('Category label (required for create, get, delete)'),
      infotypes: z
        .array(z.string())
        .optional()
        .describe('List of infotype identifiers to include in the category'),
      nextToken: z
        .string()
        .optional()
        .describe(
          'Continuation token returned by the previous list response. Omit page when using this token.'
        ),
      page: z
        .number()
        .optional()
        .describe(
          'Zero-based page number. Later pages follow provider continuation tokens; prefer nextToken for efficient paging.'
        ),
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
      baseUrl: ctx.auth.baseUrl ?? ctx.config.baseUrl,
      organisationId: ctx.input.organisationId
    });

    let { action, categoryLabel } = ctx.input;

    switch (action) {
      case 'create': {
        if (!categoryLabel || !ctx.input.infotypes?.length) {
          throw createApiServiceError(
            'categoryLabel and infotypes are required for creating an infotype category'
          );
        }
        let result = await client.createInfotypeCategory({
          categoryLabel,
          infotypes: ctx.input.infotypes
        });
        let data = result;
        return {
          output: { category: data, success: true },
          message: `Infotype category **${categoryLabel}** created with **${ctx.input.infotypes.length}** infotype(s).`
        };
      }
      case 'get': {
        if (!categoryLabel)
          throw createApiServiceError('categoryLabel is required for get action');
        let result = await client.getInfotypeCategory(categoryLabel);
        let data = result;
        return {
          output: { category: data, success: true },
          message: `Retrieved infotype category **${categoryLabel}**.`
        };
      }
      case 'list': {
        let result = await client.listInfotypeCategories({
          page: ctx.input.page,
          nextToken: ctx.input.nextToken,
          size: ctx.input.size,
          sortBy: ctx.input.sortBy,
          sortOrder: ctx.input.sortOrder
        });
        let data = result;
        let categories = readList(data, 'categories');
        return {
          output: { categories, success: true, ...listMetadata(data) },
          message: `Found **${categories.length}** infotype category/ies.`
        };
      }
      case 'delete': {
        if (!categoryLabel)
          throw createApiServiceError('categoryLabel is required for delete action');
        await client.deleteInfotypeCategory(categoryLabel);
        return {
          output: { success: true },
          message: `Infotype category **${categoryLabel}** deleted.`
        };
      }
    }
  })
  .build();
