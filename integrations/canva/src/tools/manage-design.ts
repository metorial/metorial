import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDesigns = SlateTool.create(spec, {
  name: 'List Designs',
  key: 'list_designs',
  description: `List and search designs in the user's Canva account. Supports filtering by search query, ownership, and sorting. Returns paginated results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().max(255).optional().describe('Search query to filter designs'),
      ownership: z
        .enum(['any', 'owned', 'shared'])
        .optional()
        .describe('Filter by ownership type'),
      sortBy: z
        .enum([
          'relevance',
          'modified_descending',
          'modified_ascending',
          'title_descending',
          'title_ascending'
        ])
        .optional()
        .describe('Sort order'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of results per page (1-100, default 25)'),
      continuation: z.string().optional().describe('Pagination token from a previous response')
    })
  )
  .output(
    z.object({
      designs: z
        .array(
          z.object({
            designId: z.string(),
            title: z.string().optional(),
            ownerUserId: z.string().optional(),
            ownerTeamId: z.string().optional(),
            editUrl: z.string().optional(),
            viewUrl: z.string().optional(),
            createdAt: z.number(),
            updatedAt: z.number(),
            thumbnailUrl: z.string().optional(),
            pageCount: z.number().optional()
          })
        )
        .describe('List of designs'),
      continuation: z.string().optional().describe('Token for retrieving the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listDesigns({
      query: ctx.input.query,
      ownership: ctx.input.ownership,
      sortBy: ctx.input.sortBy,
      limit: ctx.input.limit,
      continuation: ctx.input.continuation
    });

    return {
      output: result,
      message: `Found **${result.designs.length}** designs.${result.continuation ? ' More results available.' : ''}`
    };
  })
  .build();

export let getDesign = SlateTool.create(spec, {
  name: 'Get Design',
  key: 'get_design',
  description: `Retrieve metadata for a specific Canva design, including title, owner, temporary edit/view URLs, timestamps, thumbnail, and page count.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      designId: z.string().describe('The ID of the design to retrieve')
    })
  )
  .output(
    z.object({
      designId: z.string().describe('The design ID'),
      title: z.string().optional().describe('Design title'),
      ownerUserId: z.string().optional().describe('Owner user ID'),
      ownerTeamId: z.string().optional().describe('Owner team ID'),
      editUrl: z.string().optional().describe('Temporary edit URL (valid for 30 days)'),
      viewUrl: z.string().optional().describe('Temporary view URL (valid for 30 days)'),
      createdAt: z.number().describe('Unix timestamp of creation'),
      updatedAt: z.number().describe('Unix timestamp of last modification'),
      thumbnailUrl: z.string().optional().describe('Thumbnail URL (expires after 15 minutes)'),
      pageCount: z.number().optional().describe('Number of pages in the design')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let design = await client.getDesign(ctx.input.designId);

    return {
      output: design,
      message: `Retrieved design **${design.title || design.designId}** (${design.pageCount || 1} page(s)).`
    };
  })
  .build();

export let createDesign = SlateTool.create(spec, {
  name: 'Create Design',
  key: 'create_design',
  description: `Create a new Canva design. Choose a preset type (doc, whiteboard, presentation) or specify custom dimensions. Optionally include a title and an initial image asset.`,
  instructions: [
    'Blank designs are automatically deleted if not edited within 7 days.',
    'Temporary edit/view URLs in the response expire after 30 days.'
  ],
  constraints: ['Custom dimensions must be between 40 and 8000 pixels.']
})
  .input(
    z.object({
      presetType: z
        .enum(['doc', 'whiteboard', 'presentation'])
        .optional()
        .describe('Preset design type. Use this OR custom dimensions, not both.'),
      width: z
        .number()
        .min(40)
        .max(8000)
        .optional()
        .describe('Custom width in pixels (use with height instead of presetType)'),
      height: z
        .number()
        .min(40)
        .max(8000)
        .optional()
        .describe('Custom height in pixels (use with width instead of presetType)'),
      title: z.string().min(1).max(255).optional().describe('Design title (1-255 characters)'),
      assetId: z.string().optional().describe('Image asset ID to insert into the design')
    })
  )
  .output(
    z.object({
      designId: z.string().describe('The new design ID'),
      title: z.string().optional().describe('Design title'),
      editUrl: z.string().optional().describe('Temporary edit URL (valid for 30 days)'),
      viewUrl: z.string().optional().describe('Temporary view URL (valid for 30 days)'),
      createdAt: z.number().describe('Unix timestamp of creation'),
      updatedAt: z.number().describe('Unix timestamp of last modification'),
      thumbnailUrl: z.string().optional().describe('Thumbnail URL'),
      pageCount: z.number().optional().describe('Number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let designType:
      | { type: 'preset'; name: string }
      | { type: 'custom'; width: number; height: number };

    if (ctx.input.presetType) {
      designType = { type: 'preset', name: ctx.input.presetType };
    } else if (ctx.input.width && ctx.input.height) {
      designType = { type: 'custom', width: ctx.input.width, height: ctx.input.height };
    } else {
      throw new Error('Either presetType or both width and height must be provided.');
    }

    let design = await client.createDesign({
      designType,
      title: ctx.input.title,
      assetId: ctx.input.assetId
    });

    return {
      output: design,
      message: `Created design **${design.title || design.designId}**. [Edit](${design.editUrl})`
    };
  })
  .build();
