import { SlateTool } from 'slates';
import { z } from 'zod';
import { ImejisClient } from '../lib/client';
import { spec } from '../spec';

export let listDesignsTool = SlateTool.create(spec, {
  name: 'List Designs',
  key: 'list_designs',
  description: `Search and browse available Imejis.io design templates. Supports filtering by name or description, pagination via cursors, and filtering by public/private visibility.
Returns a list of design summaries with metadata such as name, description, thumbnail URL, and design ID — which can then be used with the **Generate Image** tool.`,
  instructions: [
    'Use the search parameter to filter designs by name or description keywords.',
    'Use cursor-based pagination to iterate through large template libraries.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      search: z
        .string()
        .optional()
        .describe('Search query to filter designs by name or description.'),
      cursor: z
        .string()
        .optional()
        .describe('Pagination cursor from a previous response to fetch the next page.'),
      limit: z.number().optional().describe('Maximum number of designs to return per page.'),
      isPublic: z
        .boolean()
        .optional()
        .describe(
          'Filter designs by public visibility. True for public designs only, false for private only.'
        )
    })
  )
  .output(
    z.object({
      designs: z
        .array(
          z.object({
            designId: z.string().describe('Unique ID of the design template.'),
            name: z.string().describe('Name of the design template.'),
            description: z.string().optional().describe('Description of the design template.'),
            thumbnailUrl: z
              .string()
              .optional()
              .describe('URL of the design thumbnail preview.'),
            isPublic: z
              .boolean()
              .optional()
              .describe('Whether the design is publicly accessible.'),
            createdAt: z
              .string()
              .optional()
              .describe('ISO timestamp of when the design was created.'),
            updatedAt: z
              .string()
              .optional()
              .describe('ISO timestamp of when the design was last updated.')
          })
        )
        .describe('List of matching design templates.'),
      cursor: z.string().optional().describe('Cursor for fetching the next page of results.'),
      hasMore: z.boolean().describe('Whether there are more designs to fetch.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ImejisClient({ token: ctx.auth.token });

    let result = await client.listDesigns({
      search: ctx.input.search,
      cursor: ctx.input.cursor,
      limit: ctx.input.limit,
      isPublic: ctx.input.isPublic
    });

    let designCount = result.designs.length;
    let searchNote = ctx.input.search ? ` matching "${ctx.input.search}"` : '';
    let moreNote = result.hasMore ? ' More results available.' : '';

    return {
      output: result,
      message: `Found **${designCount}** design(s)${searchNote}.${moreNote}`
    };
  })
  .build();
