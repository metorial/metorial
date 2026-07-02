import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getMyNetwork = SlateTool.create(spec, {
  name: 'Get My Network',
  key: 'get_my_network',
  description: `Retrieve creator profiles from your My Network section. Pull in influencer data programmatically with optional filtering by report unlock date. Uses cursor-based pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().min(1).max(100).optional().describe('Results per page (1-100)'),
      reportUnlockedFrom: z
        .string()
        .optional()
        .describe('Filter by report unlock date start (YYYY-MM-DD)'),
      reportUnlockedTo: z
        .string()
        .optional()
        .describe('Filter by report unlock date end (YYYY-MM-DD)'),
      cursor: z.number().optional().describe('Pagination cursor from previous response')
    })
  )
  .output(
    z.object({
      creators: z
        .array(z.any())
        .describe(
          'Array of creator profiles with contact info, social networks, and statuses'
        ),
      nextCursor: z.number().optional().describe('Cursor for next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId,
      apiVersion: ctx.config.apiVersion
    });

    let response = await client.getCreators({
      limit: ctx.input.limit,
      reportUnlockedFrom: ctx.input.reportUnlockedFrom,
      reportUnlockedTo: ctx.input.reportUnlockedTo,
      cursor: ctx.input.cursor
    });

    let result = response?.result ?? response;
    let creators = result?.data ?? result?.creators ?? [];
    let nextCursor = result?.next_cursor;

    return {
      output: {
        creators: Array.isArray(creators) ? creators : [],
        nextCursor
      },
      message: `Retrieved **${Array.isArray(creators) ? creators.length : 0}** creator(s) from My Network.`
    };
  })
  .build();
