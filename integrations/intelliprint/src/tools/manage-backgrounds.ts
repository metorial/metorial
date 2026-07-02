import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { backgroundSchema, mapBackground } from '../lib/schemas';
import { spec } from '../spec';

export let listBackgrounds = SlateTool.create(spec, {
  name: 'List Backgrounds',
  key: 'list_backgrounds',
  description: `List available background images and letterheads that can be applied to print jobs. Backgrounds are reusable across multiple print jobs for consistent branding.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().min(1).max(1000).default(10).describe('Number of results to return'),
      skip: z.number().default(0).describe('Number of results to skip for pagination'),
      sortField: z.enum(['created', 'name']).optional().describe('Field to sort by'),
      sortOrder: z.enum(['asc', 'desc']).default('desc').describe('Sort order')
    })
  )
  .output(
    z.object({
      backgrounds: z.array(backgroundSchema).describe('List of backgrounds'),
      totalAvailable: z.number().describe('Total number of backgrounds'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let params: Record<string, any> = {
      limit: ctx.input.limit,
      skip: ctx.input.skip,
      sort_order: ctx.input.sortOrder
    };
    if (ctx.input.sortField) params.sort_field = ctx.input.sortField;

    let result = await client.listBackgrounds(params);

    return {
      output: {
        backgrounds: result.data.map(mapBackground),
        totalAvailable: result.total_available,
        hasMore: result.has_more
      },
      message: `Found **${result.total_available}** background(s). Showing ${result.data.length} result(s).`
    };
  })
  .build();

export let getBackground = SlateTool.create(spec, {
  name: 'Get Background',
  key: 'get_background',
  description: `Retrieve details of a specific background/letterhead including its preview URL.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      backgroundId: z.string().describe('The ID of the background to retrieve')
    })
  )
  .output(backgroundSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getBackground(ctx.input.backgroundId);
    let mapped = mapBackground(result);

    return {
      output: mapped,
      message: `Background **${mapped.backgroundId}** ("${mapped.name ?? 'unnamed'}") retrieved.`
    };
  })
  .build();

export let deleteBackground = SlateTool.create(spec, {
  name: 'Delete Background',
  key: 'delete_background',
  description: `Delete a background/letterhead. This cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      backgroundId: z.string().describe('The ID of the background to delete')
    })
  )
  .output(
    z.object({
      backgroundId: z.string().describe('The deleted background ID'),
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteBackground(ctx.input.backgroundId);

    return {
      output: {
        backgroundId: ctx.input.backgroundId,
        deleted: true
      },
      message: `Background **${ctx.input.backgroundId}** deleted.`
    };
  })
  .build();
