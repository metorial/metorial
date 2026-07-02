import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { bigcommerceServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageBrand = SlateTool.create(spec, {
  name: 'Manage Brand',
  key: 'manage_brand',
  description: `List, create, update, or delete product brands. Brands help organize products and are displayed on the storefront for filtering and navigation.`,
  instructions: [
    'Use action "list" to retrieve brands with optional search.',
    'Use action "create" to create a new brand.',
    'Use action "update" to modify an existing brand.',
    'Use action "delete" to remove a brand.'
  ]
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Action to perform'),
      brandId: z.number().optional().describe('Brand ID (required for update/delete)'),
      name: z.string().optional().describe('Brand name (required for create)'),
      pageTitle: z.string().optional().describe('SEO page title'),
      searchKeywords: z.string().optional().describe('Comma-separated search keywords'),
      imageUrl: z.string().optional().describe('Brand image URL'),
      page: z.number().optional().describe('Page number for list pagination'),
      limit: z.number().optional().describe('Results per page for list')
    })
  )
  .output(
    z.object({
      brand: z.any().optional().describe('The created or updated brand'),
      brands: z.array(z.any()).optional().describe('List of brands'),
      deleted: z.boolean().optional().describe('Whether the brand was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      storeHash: ctx.config.storeHash
    });

    if (ctx.input.action === 'list') {
      let params: Record<string, any> = {};
      if (ctx.input.name) params.name = ctx.input.name;
      if (ctx.input.page) params.page = ctx.input.page;
      if (ctx.input.limit) params.limit = ctx.input.limit;
      let result = await client.listBrands(params);
      return {
        output: { brands: result.data },
        message: `Found ${result.data.length} brands.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.brandId) throw bigcommerceServiceError('brandId is required for delete');
      await client.deleteBrand(ctx.input.brandId);
      return {
        output: { deleted: true },
        message: `Deleted brand with ID ${ctx.input.brandId}.`
      };
    }

    let data: Record<string, any> = {};
    if (ctx.input.name) data.name = ctx.input.name;
    if (ctx.input.pageTitle) data.page_title = ctx.input.pageTitle;
    if (ctx.input.searchKeywords) data.search_keywords = ctx.input.searchKeywords;
    if (ctx.input.imageUrl) data.image_url = ctx.input.imageUrl;

    if (ctx.input.action === 'create') {
      let result = await client.createBrand(data);
      return {
        output: { brand: result.data },
        message: `Created brand **${result.data.name}** (ID: ${result.data.id}).`
      };
    }

    if (!ctx.input.brandId) throw bigcommerceServiceError('brandId is required for update');
    let result = await client.updateBrand(ctx.input.brandId, data);
    return {
      output: { brand: result.data },
      message: `Updated brand **${result.data.name}** (ID: ${result.data.id}).`
    };
  })
  .build();
