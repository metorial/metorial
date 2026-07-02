import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageServiceCategory = SlateTool.create(spec, {
  name: 'Manage Service Category',
  key: 'manage_service_category',
  description: `Create, retrieve, list, or delete service categories. Service categories group related services together for organization.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'list', 'delete']).describe('Action to perform'),
      categoryId: z.string().optional().describe('Category ID (required for get and delete)'),
      name: z.string().optional().describe('Category name (for create)'),
      description: z.string().optional().describe('Category description (for create)'),
      page: z.number().optional().describe('Page number (for list)'),
      pageSize: z.number().optional().describe('Results per page (for list)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      category: z.record(z.string(), z.any()).optional().describe('Category record'),
      categories: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of categories')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiHost: ctx.config.apiHost
    });

    let { action } = ctx.input;

    if (action === 'create') {
      let data: Record<string, any> = {};
      if (ctx.input.name) data.name = ctx.input.name;
      if (ctx.input.description) data.description = ctx.input.description;

      let result = await client.createServiceCategory(data);
      return {
        output: { success: true, category: result },
        message: `Created service category **${ctx.input.name}**.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.categoryId) throw new Error('categoryId is required for get');
      let result = await client.getServiceCategory(ctx.input.categoryId);
      return {
        output: { success: true, category: result },
        message: `Retrieved service category **${result.name || ctx.input.categoryId}**.`
      };
    }

    if (action === 'list') {
      let result = await client.listServiceCategories({
        page: ctx.input.page,
        pageSize: ctx.input.pageSize
      });
      let categories = Array.isArray(result)
        ? result
        : result.serviceCategories || result.data || [];
      return {
        output: { success: true, categories },
        message: `Found **${categories.length}** service category(ies).`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.categoryId) throw new Error('categoryId is required for delete');
      await client.deleteServiceCategory(ctx.input.categoryId);
      return {
        output: { success: true },
        message: `Deleted service category ${ctx.input.categoryId}.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
