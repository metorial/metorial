import { SlateTool } from 'slates';
import { z } from 'zod';
import { SmartsheetClient } from '../lib/client';
import { spec } from '../spec';

let searchResultSchema = z.object({
  text: z.string().optional().describe('Matching text'),
  objectType: z
    .string()
    .optional()
    .describe('Type of the matched object (sheet, row, discussion, etc.)'),
  objectId: z.number().optional().describe('ID of the matched object'),
  parentObjectId: z
    .number()
    .optional()
    .describe('ID of the parent object (e.g., sheet ID for a row match)'),
  parentObjectType: z.string().optional().describe('Type of the parent object'),
  parentObjectName: z.string().optional().describe('Name of the parent object'),
  contextData: z.array(z.string()).optional().describe('Additional context for the match')
});

export let search = SlateTool.create(spec, {
  name: 'Search',
  key: 'search',
  description: `Search across all accessible sheets or within a specific sheet. Returns matching results with context including the object type, parent sheet, and matched text.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search query text'),
      sheetId: z.string().optional().describe('Limit search to a specific sheet ID')
    })
  )
  .output(
    z.object({
      results: z.array(searchResultSchema).describe('Search results'),
      totalCount: z.number().optional().describe('Total number of matching results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SmartsheetClient({ token: ctx.auth.token });

    let result: any;
    if (ctx.input.sheetId) {
      result = await client.searchSheet(ctx.input.sheetId, ctx.input.query);
    } else {
      result = await client.searchAll(ctx.input.query);
    }

    let results = (result.results || []).map((r: any) => ({
      text: r.text,
      objectType: r.objectType,
      objectId: r.objectId,
      parentObjectId: r.parentObjectId,
      parentObjectType: r.parentObjectType,
      parentObjectName: r.parentObjectName,
      contextData: r.contextData
    }));

    return {
      output: {
        results,
        totalCount: result.totalCount
      },
      message: `Found **${results.length}** result(s) for "${ctx.input.query}".`
    };
  })
  .build();
